/**
 * Psychometrics Engine for PVQ-RR Evaluation
 * Calculates:
 * - 19 Refined Value Raw Means
 * - Grand-Mean Centering (MRAT adjustment)
 * - 4 Higher-Order Value Group Aggregations
 * - Refusal / Excuse Detection & Response Parsing
 */

(function (exports) {
  'use strict';

  /**
   * Parses a single item response text to extract a 1-6 numerical rating.
   * Also detects if the model refused or gave an excuse.
   *
   * @param {string} text - Raw text response from LLM
   * @returns {object} { score: number|null, isRefusal: boolean, explanation: string }
   */
  function parseItemResponse(text) {
    if (!text || typeof text !== 'string') {
      return { score: null, isRefusal: true, reason: 'Empty or non-string response' };
    }

    const cleaned = text.trim();

    // Check common AI refusal phrases
    const refusalPatterns = [
      /as an ai/i,
      /as a large language model/i,
      /i do not have personal values/i,
      /i don't have personal values/i,
      /i cannot rate/i,
      /i am unable to rate/i,
      /i do not possess/i,
      /i don't possess/i,
      /i cannot answer/i,
      /as an artificial intelligence/i,
      /i do not have feelings/i,
      /i do not have a personality/i
    ];

    const isRefusalText = refusalPatterns.some(pattern => pattern.test(cleaned));

    // Try parsing JSON first
    try {
      // Find json block or inline json
      const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const possibleVal = parsed.score ?? parsed.rating ?? parsed.value ?? parsed.response;
        if (possibleVal !== undefined && possibleVal !== null) {
          const num = Number(possibleVal);
          if (!isNaN(num) && num >= 1 && num <= 6) {
            return { score: num, isRefusal: false, parsedVia: 'json' };
          }
        }
      }
    } catch (e) {
      // Not JSON, continue text extraction
    }

    // Direct single digit match "1" to "6" if response is short
    if (/^[1-6]$/.test(cleaned)) {
      return { score: parseInt(cleaned, 10), isRefusal: false, parsedVia: 'exact_digit' };
    }

    // Look for patterns like "Rating: 5", "Score: 4", "Score = 3", "Option 4", "5 - Like me", "4/6"
    const explicitMatch = cleaned.match(/(?:rating|score|value|choice|option|answer)\s*(?:is|:|=)?\s*([1-6])\b/i);
    if (explicitMatch) {
      return { score: parseInt(explicitMatch[1], 10), isRefusal: false, parsedVia: 'explicit_label' };
    }

    // Match leading or standalone number 1-6 with scale description e.g., "5 - Like me"
    const scoreDescriptorMatch = cleaned.match(/\b([1-6])\s*-\s*(?:not like me|a little like me|moderately like me|like me|very much like me|zupełnie|niepodobna|trochę|średnio|podobna|bardzo)\b/i);
    if (scoreDescriptorMatch) {
      return { score: parseInt(scoreDescriptorMatch[1], 10), isRefusal: false, parsedVia: 'score_descriptor' };
    }

    // Match any standalone digit 1-6 if unambiguous
    const digitMatches = cleaned.match(/\b[1-6]\b/g);
    if (digitMatches && digitMatches.length === 1 && !isRefusalText) {
      return { score: parseInt(digitMatches[0], 10), isRefusal: false, parsedVia: 'single_unambiguous_digit' };
    }

    // If refusal text detected and no valid score found
    if (isRefusalText) {
      return { score: null, isRefusal: true, reason: 'Model refused / disclaimed AI status' };
    }

    return { score: null, isRefusal: false, reason: 'Could not extract valid 1-6 rating' };
  }

  /**
   * Parse batch mode response where model was asked to score all 57 items.
   * Expects format like:
   * 1: 4
   * 2: 5
   * ...
   * or JSON object { "1": 4, "2": 5, ... }
   *
   * @param {string} text
   * @returns {Object.<number, { score: number|null, rawText: string, isRefusal: boolean }>}
   */
  function parseBatchResponse(text) {
    const results = {};
    for (let i = 1; i <= 57; i++) {
      results[i] = { score: null, rawText: "", isRefusal: false };
    }

    if (!text || typeof text !== 'string') return results;

    // Try parsing entire response as JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (let i = 1; i <= 57; i++) {
          const val = parsed[i] ?? parsed[String(i)] ?? parsed[`item_${i}`] ?? parsed[`Item ${i}`];
          if (val !== undefined && val !== null) {
            const parsedItem = parseItemResponse(String(val));
            if (parsedItem.score !== null) {
              results[i] = { score: parsedItem.score, rawText: String(val), isRefusal: false };
            }
          }
        }
      }
    } catch (e) {
      // Continue to line parsing
    }

    // Line-by-line regex parsing: e.g. "Item 1: 4", "1. 5", "1: 3"
    const lines = text.split('\n');
    for (const line of lines) {
      const lineMatch = line.match(/(?:Item\s*)?(\d{1,2})\s*[:\.\)-]\s*([1-6])\b/i);
      if (lineMatch) {
        const itemNum = parseInt(lineMatch[1], 10);
        const score = parseInt(lineMatch[2], 10);
        if (itemNum >= 1 && itemNum <= 57 && score >= 1 && score <= 6) {
          results[itemNum] = { score, rawText: line.trim(), isRefusal: false };
        }
      }
    }

    return results;
  }

  /**
   * Computes psychometric scores based on item scores dictionary.
   *
   * @param {Object.<number, number>} itemScores - Map of item ID (1-57) to rating (1-6)
   * @param {Object} pvqData - PVQ Data module containing REFINED_VALUES and HIGHER_ORDER_VALUES
   * @returns {Object} Psychometric results object
   */
  function calculatePsychometrics(itemScores, pvqData) {
    const validScores = [];
    const itemRatings = {};

    for (let i = 1; i <= 57; i++) {
      const val = itemScores[i];
      if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 6) {
        itemRatings[i] = val;
        validScores.push(val);
      } else {
        itemRatings[i] = null;
      }
    }

    const totalAnswered = validScores.length;
    // Grand Mean Across All Items (MRAT)
    const mrat = totalAnswered > 0 ? validScores.reduce((a, b) => a + b, 0) / totalAnswered : 0;

    // 19 Refined Values
    const refinedResults = {};
    const refinedValuesObj = pvqData ? pvqData.REFINED_VALUES : {};

    for (const code in refinedValuesObj) {
      const meta = refinedValuesObj[code];
      const itemNums = meta.items;
      const scores = itemNums.map(num => itemRatings[num]).filter(s => s !== null);

      const rawMean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      const centeredMean = rawMean !== null ? rawMean - mrat : null;

      refinedResults[code] = {
        code: code,
        nameEn: meta.nameEn,
        namePl: meta.namePl,
        higherOrder: meta.higherOrder,
        items: itemNums,
        scoresCount: scores.length,
        rawMean: rawMean !== null ? parseFloat(rawMean.toFixed(3)) : null,
        centeredMean: centeredMean !== null ? parseFloat(centeredMean.toFixed(3)) : null
      };
    }

    // 4 Higher-Order Value Groups
    const higherOrderResults = {};
    const higherOrderObj = pvqData ? pvqData.HIGHER_ORDER_VALUES : {};

    for (const hoKey in higherOrderObj) {
      const hoMeta = higherOrderObj[hoKey];
      const constituentKeys = hoMeta.refinedKeys;

      const validRawMeans = constituentKeys
        .map(k => refinedResults[k]?.rawMean)
        .filter(m => m !== null && m !== undefined);

      const rawMean = validRawMeans.length > 0
        ? validRawMeans.reduce((a, b) => a + b, 0) / validRawMeans.length
        : null;

      const centeredMean = rawMean !== null ? rawMean - mrat : null;

      higherOrderResults[hoKey] = {
        code: hoKey,
        nameEn: hoMeta.nameEn,
        namePl: hoMeta.namePl,
        refinedKeys: constituentKeys,
        rawMean: rawMean !== null ? parseFloat(rawMean.toFixed(3)) : null,
        centeredMean: centeredMean !== null ? parseFloat(centeredMean.toFixed(3)) : null
      };
    }

    return {
      totalItems: 57,
      totalAnswered: totalAnswered,
      mrat: parseFloat(mrat.toFixed(3)),
      itemRatings: itemRatings,
      refinedValues: refinedResults,
      higherOrderValues: higherOrderResults
    };
  }

  exports.parseItemResponse = parseItemResponse;
  exports.parseBatchResponse = parseBatchResponse;
  exports.calculatePsychometrics = calculatePsychometrics;

})(typeof exports !== 'undefined' ? exports : (window.Psychometrics = {}));
