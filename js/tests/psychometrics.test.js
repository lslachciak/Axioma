const { test, describe } = require('node:test');
const assert = require('node:assert');

// Provide exports object for the IIFE to attach to
const psychMetricsExports = {};
const pvqDataExports = {};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // just in case

const psychCode = fs.readFileSync(path.join(__dirname, '../psychometrics.js'), 'utf8');
const pvqDataCode = fs.readFileSync(path.join(__dirname, '../pvq_data.js'), 'utf8');

// Evaluate the scripts in this context, passing our exports object
const evalCode = (code, exportsObj) => {
    // We simulate the global scope expectation where 'exports' is available
    const fn = new Function('exports', code);
    fn(exportsObj);
};

evalCode(psychCode, psychMetricsExports);
evalCode(pvqDataCode, pvqDataExports);

const { parseItemResponse, parseBatchResponse, calculatePsychometrics } = psychMetricsExports;

describe('parseItemResponse', () => {
    test('handles empty and invalid input', () => {
        assert.deepStrictEqual(parseItemResponse(null), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
        assert.deepStrictEqual(parseItemResponse(''), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
        assert.deepStrictEqual(parseItemResponse({}), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
    });

    test('detects refusals', () => {
        const refusal = parseItemResponse("As an AI, I don't have personal values to answer this.");
        assert.strictEqual(refusal.isRefusal, true);
        assert.strictEqual(refusal.score, null);
    });

    test('extracts JSON format', () => {
        const result = parseItemResponse('\`\`\`json\n{"score": 4}\n\`\`\`');
        assert.strictEqual(result.score, 4);
        assert.strictEqual(result.isRefusal, false);
        assert.strictEqual(result.parsedVia, 'json');
    });

    test('extracts exact digit', () => {
        const result = parseItemResponse('5');
        assert.strictEqual(result.score, 5);
        assert.strictEqual(result.parsedVia, 'exact_digit');
    });

    test('extracts explicit label', () => {
        const result = parseItemResponse('Score: 3');
        assert.strictEqual(result.score, 3);
        assert.strictEqual(result.parsedVia, 'explicit_label');

        const result2 = parseItemResponse('Rating is 6');
        assert.strictEqual(result2.score, 6);
    });

    test('extracts score descriptor', () => {
        const result = parseItemResponse('5 - Like me');
        assert.strictEqual(result.score, 5);
        assert.strictEqual(result.parsedVia, 'score_descriptor');

        const result2 = parseItemResponse('2 - niepodobny do mnie');
        assert.strictEqual(result2.score, 2);
    });

    test('extracts single unambiguous digit', () => {
        const result = parseItemResponse('I would rate this a 4 overall.');
        assert.strictEqual(result.score, 4);
        assert.strictEqual(result.parsedVia, 'single_unambiguous_digit');
    });

    test('returns null for ambiguous multiple digits', () => {
        const result = parseItemResponse('I am torn between 3 and 4.');
        assert.strictEqual(result.score, null);
        assert.strictEqual(result.isRefusal, false);
    });
});

describe('parseBatchResponse', () => {
    test('returns default map for empty input', () => {
        const result = parseBatchResponse('');
        assert.strictEqual(Object.keys(result).length, 57);
        assert.strictEqual(result[1].score, null);
        assert.strictEqual(result[57].score, null);
    });

    test('parses line-by-line format', () => {
        const text = `
Here are my ratings:
Item 1: 4
2: 5
3. 2
4 - 6
5) 1
`;
        const result = parseBatchResponse(text);
        assert.strictEqual(result[1].score, 4);
        assert.strictEqual(result[2].score, 5);
        assert.strictEqual(result[3].score, 2);
        assert.strictEqual(result[4].score, 6);
        assert.strictEqual(result[5].score, 1);

        // Ensure others are null
        assert.strictEqual(result[6].score, null);
    });

    test('parses full JSON object', () => {
        const text = `
\`\`\`json
{
  "1": 4,
  "item_2": 5,
  "Item 3": 6
}
\`\`\`
`;
        const result = parseBatchResponse(text);
        assert.strictEqual(result[1].score, 4);
        assert.strictEqual(result[2].score, 5);
        assert.strictEqual(result[3].score, 6);
    });
});

describe('calculatePsychometrics', () => {
    const mockPvqData = {
        REFINED_VALUES: {
            "VAL1": { items: [1, 2], nameEn: "Value 1", namePl: "Wartość 1", higherOrder: "HO1" },
            "VAL2": { items: [3, 4], nameEn: "Value 2", namePl: "Wartość 2", higherOrder: "HO1" }
        },
        HIGHER_ORDER_VALUES: {
            "HO1": { refinedKeys: ["VAL1", "VAL2"], nameEn: "Higher Order 1", namePl: "HO PL 1" }
        }
    };

    test('calculates correct psychometrics with valid scores', () => {
        const itemScores = {
            1: 4,
            2: 6,
            3: 2,
            4: 4,
            5: null // Ignored
        };

        const result = calculatePsychometrics(itemScores, mockPvqData);

        assert.strictEqual(result.totalAnswered, 4);
        // MRAT = (4 + 6 + 2 + 4) / 4 = 16 / 4 = 4.0
        assert.strictEqual(result.mrat, 4.0);

        // VAL1 rawMean = (4 + 6) / 2 = 5.0
        // VAL1 centered = 5.0 - 4.0 = 1.0
        assert.strictEqual(result.refinedValues.VAL1.rawMean, 5.0);
        assert.strictEqual(result.refinedValues.VAL1.centeredMean, 1.0);

        // VAL2 rawMean = (2 + 4) / 2 = 3.0
        // VAL2 centered = 3.0 - 4.0 = -1.0
        assert.strictEqual(result.refinedValues.VAL2.rawMean, 3.0);
        assert.strictEqual(result.refinedValues.VAL2.centeredMean, -1.0);

        // HO1 rawMean = (VAL1.rawMean + VAL2.rawMean) / 2 = (5.0 + 3.0) / 2 = 4.0
        // HO1 centered = 4.0 - 4.0 = 0.0
        assert.strictEqual(result.higherOrderValues.HO1.rawMean, 4.0);
        assert.strictEqual(result.higherOrderValues.HO1.centeredMean, 0.0);
    });

    test('handles missing or incomplete scores gracefully', () => {
        const itemScores = {
            1: 5,
            2: null, // one missing from VAL1
            3: null, // all missing from VAL2
            4: null
        };

        const result = calculatePsychometrics(itemScores, mockPvqData);

        assert.strictEqual(result.totalAnswered, 1);
        assert.strictEqual(result.mrat, 5.0); // Only item 1 answered

        // VAL1 rawMean = 5.0
        assert.strictEqual(result.refinedValues.VAL1.rawMean, 5.0);
        assert.strictEqual(result.refinedValues.VAL1.centeredMean, 0.0);

        // VAL2 is completely empty
        assert.strictEqual(result.refinedValues.VAL2.rawMean, null);
        assert.strictEqual(result.refinedValues.VAL2.centeredMean, null);

        // HO1 rawMean only uses VAL1 since VAL2 is null
        // HO1 rawMean = 5.0
        assert.strictEqual(result.higherOrderValues.HO1.rawMean, 5.0);
        assert.strictEqual(result.higherOrderValues.HO1.centeredMean, 0.0);
    });
});

describe('calculateCronbachAlphaForSession', () => {
    const { calculateCronbachAlphaForSession } = psychMetricsExports;

    const mockPvqDataAlpha = {
        REFINED_VALUES: {
            "VAL1": { items: [1, 2] },
            "VAL2": { items: [3, 4] }
        },
        HIGHER_ORDER_VALUES: {
            "HO1": { refinedKeys: ["VAL1", "VAL2"] }
        }
    };

    test('returns empty object when < 2 iterations', () => {
        const sessionResults = [
            { psychometrics: { itemRatings: { 1: 5, 2: 4, 3: 3, 4: 2 } } }
        ];
        const alphas = calculateCronbachAlphaForSession(sessionResults, mockPvqDataAlpha);
        assert.deepStrictEqual(alphas, {});
    });

    test('calculates correct alpha for refined and higher order values', () => {
        // We will create a perfect correlation to get alpha = 1 for VAL1,
        // and somewhat mixed for VAL2.
        const sessionResults = [
            { psychometrics: { itemRatings: { 1: 5, 2: 5, 3: 4, 4: 2 } } },
            { psychometrics: { itemRatings: { 1: 4, 2: 4, 3: 3, 4: 5 } } },
            { psychometrics: { itemRatings: { 1: 3, 2: 3, 3: 5, 4: 4 } } }
        ];

        const alphas = calculateCronbachAlphaForSession(sessionResults, mockPvqDataAlpha);

        // VAL1: items 1, 2. Scores: [5,5], [4,4], [3,3]. Correlation = 1. Alpha = 1
        assert.strictEqual(alphas.VAL1, 1.000);

        // VAL2: items 3, 4.
        // item 3: 4, 3, 5 (var: 1)
        // item 4: 2, 5, 4 (var: 2.333)
        // total: 6, 8, 9 (var: 2.333)
        // alpha = (2/1) * (1 - (1 + 2.333) / 2.333) -> will be negative or small
        assert.strictEqual(typeof alphas.VAL2, 'number');
        assert.strictEqual(typeof alphas.HO1, 'number');
    });

    test('returns null when there is no variance in totals', () => {
        const sessionResults = [
            { psychometrics: { itemRatings: { 1: 3, 2: 3 } } },
            { psychometrics: { itemRatings: { 1: 4, 2: 2 } } },
            { psychometrics: { itemRatings: { 1: 5, 2: 1 } } }
        ];
        // Totals are all 6. Variance Total = 0.
        const alphas = calculateCronbachAlphaForSession(sessionResults, mockPvqDataAlpha);
        assert.strictEqual(alphas.VAL1, null);
    });

    test('handles missing data gracefully', () => {
        const sessionResults = [
            { psychometrics: { itemRatings: { 1: 5, 2: 4 } } },
            { psychometrics: { itemRatings: { 1: null, 2: 4 } } },
            { psychometrics: { itemRatings: { 1: 3, 2: 3 } } }
        ];
        const alphas = calculateCronbachAlphaForSession(sessionResults, mockPvqDataAlpha);
        // It successfully calculates Alpha for the 2 valid rows
        assert.strictEqual(typeof alphas.VAL1, 'number');
    });
});
