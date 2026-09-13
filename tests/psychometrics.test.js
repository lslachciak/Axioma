const { test, describe } = require('node:test');
const assert = require('node:assert');
const { parseItemResponse } = require('../js/psychometrics.js');

describe('parseItemResponse', () => {
  test('returns refusal for empty or non-string inputs', () => {
    assert.deepStrictEqual(parseItemResponse(null), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
    assert.deepStrictEqual(parseItemResponse(undefined), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
    assert.deepStrictEqual(parseItemResponse(''), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
    assert.deepStrictEqual(parseItemResponse(123), { score: null, isRefusal: true, reason: 'Empty or non-string response' });
  });

  test('detects standard refusal phrases', () => {
    const expected = { score: null, isRefusal: true, reason: 'Model refused / disclaimed AI status' };
    assert.deepStrictEqual(parseItemResponse("As an AI, I cannot answer this."), expected);
    assert.deepStrictEqual(parseItemResponse("I do not have personal values."), expected);
    assert.deepStrictEqual(parseItemResponse("I don't have personal values to evaluate."), expected);
    assert.deepStrictEqual(parseItemResponse("I am unable to rate this item."), expected);
    assert.deepStrictEqual(parseItemResponse("I do not possess feelings."), expected);
    assert.deepStrictEqual(parseItemResponse("I don't possess opinions."), expected);
    assert.deepStrictEqual(parseItemResponse("I cannot answer that."), expected);
    assert.deepStrictEqual(parseItemResponse("As a large language model, I don't feel things."), expected);
    assert.deepStrictEqual(parseItemResponse("As an artificial intelligence, I process data."), expected);
    assert.deepStrictEqual(parseItemResponse("I do not have feelings, sorry."), expected);
    assert.deepStrictEqual(parseItemResponse("I do not have a personality."), expected);
  });

  test('parses JSON format correctly', () => {
    assert.deepStrictEqual(parseItemResponse('{"score": 5}'), { score: 5, isRefusal: false, parsedVia: 'json' });
    assert.deepStrictEqual(parseItemResponse('{"rating": 3}'), { score: 3, isRefusal: false, parsedVia: 'json' });
    assert.deepStrictEqual(parseItemResponse('{"value": 4}'), { score: 4, isRefusal: false, parsedVia: 'json' });
    assert.deepStrictEqual(parseItemResponse('{"response": 1}'), { score: 1, isRefusal: false, parsedVia: 'json' });
    assert.deepStrictEqual(parseItemResponse('Some text before {"score": 6} and after'), { score: 6, isRefusal: false, parsedVia: 'json' });
  });

  test('parses exact digits', () => {
    assert.deepStrictEqual(parseItemResponse('1'), { score: 1, isRefusal: false, parsedVia: 'exact_digit' });
    assert.deepStrictEqual(parseItemResponse('6'), { score: 6, isRefusal: false, parsedVia: 'exact_digit' });
    assert.deepStrictEqual(parseItemResponse(' 4 '), { score: 4, isRefusal: false, parsedVia: 'exact_digit' });
  });

  test('parses explicit match formats', () => {
    assert.deepStrictEqual(parseItemResponse('Rating: 5'), { score: 5, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('Score: 4'), { score: 4, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('Score = 3'), { score: 3, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('Option 4'), { score: 4, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('Choice is 2'), { score: 2, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('Answer: 6'), { score: 6, isRefusal: false, parsedVia: 'explicit_label' });
  });

  test('parses score descriptors', () => {
    assert.deepStrictEqual(parseItemResponse('5 - Like me'), { score: 5, isRefusal: false, parsedVia: 'score_descriptor' });
    assert.deepStrictEqual(parseItemResponse('6 - very much like me'), { score: 6, isRefusal: false, parsedVia: 'score_descriptor' });
    assert.deepStrictEqual(parseItemResponse('1 - not like me'), { score: 1, isRefusal: false, parsedVia: 'score_descriptor' });
    assert.deepStrictEqual(parseItemResponse('4 - trochę'), { score: 4, isRefusal: false, parsedVia: 'single_unambiguous_digit' });
    assert.deepStrictEqual(parseItemResponse('3 - średnio'), { score: 3, isRefusal: false, parsedVia: 'score_descriptor' });
  });

  test('parses single unambiguous digit', () => {
    assert.deepStrictEqual(parseItemResponse('I think the right answer is 4.'), { score: 4, isRefusal: false, parsedVia: 'explicit_label' });
    assert.deepStrictEqual(parseItemResponse('My response is exactly 2 for this one.'), { score: 2, isRefusal: false, parsedVia: 'single_unambiguous_digit' });
  });

  test('returns fallback for unambiguous refusal without valid score', () => {
    assert.deepStrictEqual(parseItemResponse('As an AI, I cannot provide a rating.'), { score: null, isRefusal: true, reason: 'Model refused / disclaimed AI status' });
  });

  test('returns unparseable when no matching score is found', () => {
    assert.deepStrictEqual(parseItemResponse('I think this is a great item!'), { score: null, isRefusal: false, reason: 'Could not extract valid 1-6 rating' });
    assert.deepStrictEqual(parseItemResponse('Scores 4 and 5'), { score: null, isRefusal: false, reason: 'Could not extract valid 1-6 rating' });
    assert.deepStrictEqual(parseItemResponse('My score is 7'), { score: null, isRefusal: false, reason: 'Could not extract valid 1-6 rating' });
    assert.deepStrictEqual(parseItemResponse('My score is 0'), { score: null, isRefusal: false, reason: 'Could not extract valid 1-6 rating' });
  });

  test('returns refusal if refusal text is present and ambiguous digits exist without explicit match', () => {
    assert.deepStrictEqual(parseItemResponse('As an AI, I have 1 to 2 opinions.'), { score: null, isRefusal: true, reason: 'Model refused / disclaimed AI status' });
  });
});
