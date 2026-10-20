const test = require('node:test');
const assert = require('node:assert');

const ResponseView = require('../response_view.js');

function ratings(count = 57) {
  return Object.fromEntries(Array.from({ length: 57 }, (_, index) => [index + 1, index < count ? 5 : null]));
}

test('summarizes a complete batch response', () => {
  const results = { psychometrics: { itemRatings: ratings() } };
  const summary = ResponseView.summarizeBatchResponse(results, { response: '5\n'.repeat(57).trim() });

  assert.strictEqual(summary.complete, true);
  assert.strictEqual(summary.parsedCount, 57);
  assert.strictEqual(summary.candidateRatingCount, 57);
  assert.match(summary.message, /57\/57 items parsed successfully/);
});

test('diagnoses an ambiguous batch response with 67 unnumbered ratings', () => {
  const results = { psychometrics: { itemRatings: ratings(0) } };
  const summary = ResponseView.summarizeBatchResponse(results, { response: '5\n'.repeat(66) + '6' });

  assert.strictEqual(summary.complete, false);
  assert.strictEqual(summary.parsedCount, 0);
  assert.strictEqual(summary.candidateRatingCount, 67);
  assert.match(summary.message, /Expected 57 ratings but found 67 unnumbered ratings/);
});

test('finds the full sequential exchange for an item', () => {
  const results = {
    metadata: { config: { mode: 'sequential' } },
    apiExchanges: [{ mode: 'sequential', itemIds: [12], query: 'question', reasoning: 'why', response: '5' }],
    rawResponses: { 12: 'fallback' },
    parsedFragments: { 12: '5' },
    psychometrics: { itemRatings: { 12: 5 } }
  };

  assert.strictEqual(ResponseView.getExecutionMode(results), 'sequential');
  assert.deepStrictEqual(ResponseView.getItemResponseDetails(results, 12), {
    itemId: 12,
    query: 'question',
    reasoning: 'why',
    response: '5',
    parsedFragment: '5',
    score: 5
  });
});

test('does not repeat an unparsed full batch response as an item fragment', () => {
  const response = '5\n'.repeat(66) + '6';
  const results = {
    parsedFragments: { 1: response },
    psychometrics: { itemRatings: { 1: null } }
  };

  assert.strictEqual(ResponseView.getDisplayParsedFragment(results, 1, { response }), '');
});

test('keeps a genuine parsed batch fragment visible', () => {
  const results = {
    parsedFragments: { 1: '1: 5' },
    psychometrics: { itemRatings: { 1: 5 } }
  };

  assert.strictEqual(ResponseView.getDisplayParsedFragment(results, 1, { response: '1: 5\n2: 4' }), '1: 5');
});
