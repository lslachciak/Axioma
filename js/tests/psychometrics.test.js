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
