/**
 * Helpers for presenting provider responses without conflating full API output
 * with the item-level fragment used for score parsing.
 */
(function (exports) {
  'use strict';

  const EXPECTED_ITEM_COUNT = 57;

  function isValidScore(value) {
    const score = Number(value);
    return Number.isInteger(score) && score >= 1 && score <= 6;
  }

  function getExecutionMode(results) {
    return results?.metadata?.config?.mode
      || results?.apiExchanges?.[0]?.mode
      || '';
  }

  function findBatchExchange(results) {
    return (results?.apiExchanges || []).find(exchange => exchange.mode === 'batch') || null;
  }

  function findItemExchange(results, itemId) {
    const numericItemId = Number(itemId);
    return (results?.apiExchanges || []).find(exchange =>
      exchange.mode === 'sequential'
      && (exchange.itemIds || []).some(id => Number(id) === numericItemId)
    ) || null;
  }

  function getItemResponseDetails(results, itemId) {
    const exchange = findItemExchange(results, itemId);
    return {
      itemId: Number(itemId),
      query: exchange?.query || results?.llmQueries?.[itemId] || '',
      reasoning: exchange?.reasoning || results?.reasoningTraces?.[itemId] || '',
      response: exchange?.response || results?.rawResponses?.[itemId] || '',
      parsedFragment: results?.parsedFragments?.[itemId] || '',
      score: results?.psychometrics?.itemRatings?.[itemId] ?? null
    };
  }

  function getDisplayParsedFragment(results, itemId, batchExchange) {
    const fragment = results?.parsedFragments?.[itemId] || '';
    const score = results?.psychometrics?.itemRatings?.[itemId];
    const fullResponse = batchExchange?.response || '';

    // Older parser output used the whole batch response as the fragment for
    // every unrecognised item. It is not an item-level fragment, so do not
    // repeat it across all 57 rows.
    if (!isValidScore(score) && fragment.trim() && fragment.trim() === fullResponse.trim()) {
      return '';
    }
    return fragment;
  }

  function countUnnumberedRatings(response) {
    if (!response || typeof response !== 'string') return null;
    const tokens = response.trim().split(/[\s,;]+/).filter(Boolean);
    if (tokens.length === 0 || !tokens.every(token => /^[1-6]$/.test(token))) return null;
    return tokens.length;
  }

  function summarizeBatchResponse(results, batchExchange, expectedCount = EXPECTED_ITEM_COUNT) {
    const ratings = results?.psychometrics?.itemRatings || {};
    let parsedCount = 0;
    const missingItemIds = [];
    for (let itemId = 1; itemId <= expectedCount; itemId++) {
      if (isValidScore(ratings[itemId])) parsedCount++;
      else missingItemIds.push(itemId);
    }

    const candidateRatingCount = countUnnumberedRatings(batchExchange?.response || '');
    let message;
    if (parsedCount === expectedCount) {
      message = `${parsedCount}/${expectedCount} items parsed successfully.`;
    } else if (candidateRatingCount !== null && candidateRatingCount !== expectedCount) {
      message = `${parsedCount}/${expectedCount} items parsed. Expected ${expectedCount} ratings but found ${candidateRatingCount} unnumbered ratings.`;
    } else {
      message = `${parsedCount}/${expectedCount} items parsed. Review the full response and missing item mappings.`;
    }

    return {
      parsedCount,
      expectedCount,
      complete: parsedCount === expectedCount,
      candidateRatingCount,
      missingItemIds,
      message
    };
  }

  exports.EXPECTED_ITEM_COUNT = EXPECTED_ITEM_COUNT;
  exports.getExecutionMode = getExecutionMode;
  exports.findBatchExchange = findBatchExchange;
  exports.findItemExchange = findItemExchange;
  exports.getItemResponseDetails = getItemResponseDetails;
  exports.getDisplayParsedFragment = getDisplayParsedFragment;
  exports.countUnnumberedRatings = countUnnumberedRatings;
  exports.summarizeBatchResponse = summarizeBatchResponse;

})(typeof exports !== 'undefined' ? exports : (window.ResponseView = {}));
