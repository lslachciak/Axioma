const assert = require('assert');
const p = require('../js/psychometrics.js');
const parseItemResponse = p.parseItemResponse;

function runTests() {
  console.log("Running psychometrics tests...");
  let passed = 0;
  let failed = 0;

  function test(name, input, expected) {
    try {
      const result = parseItemResponse(input);
      assert.deepStrictEqual({
        score: result.score,
        isRefusal: result.isRefusal
      }, {
        score: expected.score,
        isRefusal: expected.isRefusal
      });
      passed++;
    } catch (e) {
      console.error(`❌ Test failed: ${name}`);
      console.error(`  Input: ${JSON.stringify(input)}`);
      console.error(`  Expected: ${JSON.stringify(expected)}`);
      const actual = parseItemResponse(input);
      console.error(`  Actual: ${JSON.stringify({score: actual.score, isRefusal: actual.isRefusal})}`);
      failed++;
    }
  }

  // Invalid inputs
  test("Invalid input: null", null, { score: null, isRefusal: true });
  test("Invalid input: undefined", undefined, { score: null, isRefusal: true });
  test("Invalid input: number", 5, { score: null, isRefusal: true });
  test("Invalid input: object", {}, { score: null, isRefusal: true });
  test("Invalid input: empty string", "", { score: null, isRefusal: true });

  // JSON parsing
  test("JSON parsing: score", '{"score": 5}', { score: 5, isRefusal: false });
  test("JSON parsing: rating", '{"rating": 4}', { score: 4, isRefusal: false });
  test("JSON parsing: value", '{"value": 2}', { score: 2, isRefusal: false });
  test("JSON parsing: response", '{"response": 6}', { score: 6, isRefusal: false });
  test("JSON parsing: inline json", 'Here is the result: {"score": 3}', { score: 3, isRefusal: false });

  // Exact digit matching
  test("Exact digit matching: 4", "4", { score: 4, isRefusal: false });
  test("Exact digit matching: 1", "1", { score: 1, isRefusal: false });
  test("Exact digit matching: spaces around", "  6  ", { score: 6, isRefusal: false });

  // Explicit labels
  test("Explicit label: Rating: 5", "Rating: 5", { score: 5, isRefusal: false });
  test("Explicit label: Score = 3", "Score = 3", { score: 3, isRefusal: false });
  test("Explicit label: Option 4", "Option 4", { score: 4, isRefusal: false });
  test("Explicit label: Answer is 2", "Answer is 2", { score: 2, isRefusal: false });
  test("Explicit label: Value 1", "Value 1", { score: 1, isRefusal: false });
  test("Explicit label: Score: 6", "Score: 6", { score: 6, isRefusal: false });

  // Score descriptors
  test("Score descriptor: 5 - Like me", "5 - Like me", { score: 5, isRefusal: false });
  test("Score descriptor: 4 - moderately like me", "4 - moderately like me", { score: 4, isRefusal: false });
  test("Score descriptor: 1 - not like me", "1 - not like me", { score: 1, isRefusal: false });
  test("Score descriptor: Polish (3 - trochę)", "3 - trochę", { score: 3, isRefusal: false });

  // Single unambiguous digit
  test("Single unambiguous digit: 3", "I choose 3.", { score: 3, isRefusal: false });
  test("Single unambiguous digit: 2", "My answer would be 2 in this case.", { score: 2, isRefusal: false });

  // AI refusals
  test("AI refusal: As an AI", "As an AI, I cannot answer this.", { score: null, isRefusal: true });
  test("AI refusal: Large language model", "As a large language model, I don't have personal values.", { score: null, isRefusal: true });
  test("AI refusal: No feelings", "I do not have feelings or personal opinions.", { score: null, isRefusal: true });
  test("AI refusal: Cannot rate", "I am unable to rate this item.", { score: null, isRefusal: true });
  test("AI refusal: Cannot possess", "I do not possess personal values.", { score: null, isRefusal: true });
  test("AI refusal: Mixed with number", "As an AI, I don't have personal values. I cannot give a 5.", { score: null, isRefusal: true });

  // Invalid/unparseable values
  test("Unparseable: out of bounds high", "7", { score: null, isRefusal: false });
  test("Unparseable: out of bounds low", "0", { score: null, isRefusal: false });
  test("Unparseable: random text", "This is just some random text with no numbers.", { score: null, isRefusal: false });
  test("Unparseable: multiple digits", "I am torn between 3 and 4.", { score: null, isRefusal: false });
  test("Unparseable: fractions", "My score is 3.5.", { score: null, isRefusal: false });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
