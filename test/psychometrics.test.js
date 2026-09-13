const assert = require('assert');
const { calculatePsychometrics } = require('../js/psychometrics.js');

describe('calculatePsychometrics', function() {
  const mockPvqData = {
    REFINED_VALUES: {
      SDT: { code: "SDT", nameEn: "Self-Direction - Thought", namePl: "Samosterowność - Myślenie", items: [1, 23, 39], higherOrder: "Openness" },
      ACH: { code: "ACH", nameEn: "Achievement", namePl: "Osiągnięcia", items: [17, 32, 48], higherOrder: "Enhancement" }
    },
    HIGHER_ORDER_VALUES: {
      Openness: {
        code: "Openness",
        nameEn: "Openness to Change",
        namePl: "Otwartość na zmiany",
        refinedKeys: ["SDT"]
      },
      Enhancement: {
        code: "Enhancement",
        nameEn: "Self-Enhancement",
        namePl: "Umacnianie siebie",
        refinedKeys: ["ACH"]
      }
    }
  };

  it('should calculate grand mean (MRAT) correctly', function() {
    const itemScores = {
      1: 5, 23: 5, 39: 5, // SDT mean = 5
      17: 3, 32: 3, 48: 3  // ACH mean = 3
    };

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.totalAnswered, 6);
    assert.strictEqual(results.mrat, 4); // (15 + 9) / 6 = 24 / 6 = 4
  });

  it('should ignore invalid or out of range scores', function() {
    const itemScores = {
      1: 6,
      23: 0, // out of range
      39: 7, // out of range
      17: null, // invalid type
      32: "5", // invalid type (should be number)
      48: NaN // invalid number
    };

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.totalAnswered, 1);
    assert.strictEqual(results.mrat, 6);
    assert.strictEqual(results.itemRatings[1], 6);
    assert.strictEqual(results.itemRatings[23], null);
  });

  it('should calculate refined value raw means and centered means correctly', function() {
    const itemScores = {
      1: 6, 23: 6, 39: 6, // SDT raw mean = 6
      17: 2, 32: 2, 48: 2  // ACH raw mean = 2
    };
    // MRAT = 4

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.refinedValues.SDT.rawMean, 6);
    assert.strictEqual(results.refinedValues.SDT.centeredMean, 2); // 6 - 4

    assert.strictEqual(results.refinedValues.ACH.rawMean, 2);
    assert.strictEqual(results.refinedValues.ACH.centeredMean, -2); // 2 - 4
  });

  it('should handle refined values with missing items', function() {
    const itemScores = {
      1: 6, // 23 and 39 missing
      17: 2, 32: 2, 48: 2
    };
    // valid scores: 6, 2, 2, 2. MRAT = 12 / 4 = 3

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.refinedValues.SDT.rawMean, 6);
    assert.strictEqual(results.refinedValues.SDT.centeredMean, 3); // 6 - 3
    assert.strictEqual(results.refinedValues.SDT.scoresCount, 1);
  });

  it('should set means to null if no valid items exist for a refined value', function() {
    const itemScores = {
      17: 2, 32: 2, 48: 2
    };

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.refinedValues.SDT.rawMean, null);
    assert.strictEqual(results.refinedValues.SDT.centeredMean, null);
    assert.strictEqual(results.refinedValues.SDT.scoresCount, 0);
  });

  it('should calculate higher-order value raw means and centered means correctly', function() {
    const itemScores = {
      1: 6, 23: 6, 39: 6, // SDT raw mean = 6
      17: 2, 32: 2, 48: 2  // ACH raw mean = 2
    };

    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.higherOrderValues.Openness.rawMean, 6);
    assert.strictEqual(results.higherOrderValues.Openness.centeredMean, 2);

    assert.strictEqual(results.higherOrderValues.Enhancement.rawMean, 2);
    assert.strictEqual(results.higherOrderValues.Enhancement.centeredMean, -2);
  });

  it('should handle higher-order values when some refined constituents are missing', function() {
    const localMockPvqData = {
      REFINED_VALUES: {
        SDT: { code: "SDT", items: [1] },
        SDA: { code: "SDA", items: [2] }
      },
      HIGHER_ORDER_VALUES: {
        Openness: {
          code: "Openness",
          refinedKeys: ["SDT", "SDA"]
        }
      }
    };

    // Only provide score for SDT, leave SDA empty
    const itemScores = {
      1: 5
    };

    const results = calculatePsychometrics(itemScores, localMockPvqData);

    assert.strictEqual(results.totalAnswered, 1);
    assert.strictEqual(results.mrat, 5);

    assert.strictEqual(results.refinedValues.SDT.rawMean, 5);
    assert.strictEqual(results.refinedValues.SDA.rawMean, null);

    // Openness raw mean should be based only on SDT since SDA is null
    assert.strictEqual(results.higherOrderValues.Openness.rawMean, 5);
    assert.strictEqual(results.higherOrderValues.Openness.centeredMean, 0);
  });

  it('should set higher-order means to null if all refined constituents are missing', function() {
    const itemScores = {}; // No scores provided
    const results = calculatePsychometrics(itemScores, mockPvqData);

    assert.strictEqual(results.higherOrderValues.Openness.rawMean, null);
    assert.strictEqual(results.higherOrderValues.Openness.centeredMean, null);
  });
});
