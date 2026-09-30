const test = require('node:test');
const assert = require('node:assert');
const { parseRetryDelayMs } = require('../api_client.js');

test('parseRetryDelayMs - should extract delay from retry-after header (integer)', (t) => {
  const headers = new Map();
  headers.set('retry-after', '15');
  const delay = parseRetryDelayMs('', headers);
  assert.strictEqual(delay, 15000);
});

test('parseRetryDelayMs - should extract delay from retry-after header (float)', (t) => {
  const headers = new Map();
  headers.set('retry-after', '2.5');
  const delay = parseRetryDelayMs('', headers);
  // Math.ceil(2.5) * 1000 = 3000
  assert.strictEqual(delay, 3000);
});

test('parseRetryDelayMs - should fallback to regex if header is missing', (t) => {
  const headers = new Map();
  const delay = parseRetryDelayMs('Rate limit exceeded. Please retry in 10s.', headers);
  assert.strictEqual(delay, 10000);
});

test('parseRetryDelayMs - should fallback to regex if headers not provided', (t) => {
  const delay = parseRetryDelayMs('Rate limit exceeded. Please retry in 10s.');
  assert.strictEqual(delay, 10000);
});

test('parseRetryDelayMs - should extract delay from "retry after Xs" message', (t) => {
  const delay = parseRetryDelayMs('retry after 12 s', null);
  assert.strictEqual(delay, 12000);
});

test('parseRetryDelayMs - should extract delay from "retry in X" message', (t) => {
  const delay = parseRetryDelayMs('retry in 5', null);
  assert.strictEqual(delay, 5000);
});

test('parseRetryDelayMs - should extract delay from "Xs" message', (t) => {
  const delay = parseRetryDelayMs('Please wait 3.14s before trying again.', null);
  assert.strictEqual(delay, 4000); // Math.ceil(3.14) = 4, 4 * 1000 = 4000
});

test('parseRetryDelayMs - should return 5000ms if no match is found', (t) => {
  const delay = parseRetryDelayMs('An unknown error occurred.', null);
  assert.strictEqual(delay, 5000);
});

test('parseRetryDelayMs - should handle invalid header value', (t) => {
  const headers = new Map();
  headers.set('retry-after', 'invalid');
  const delay = parseRetryDelayMs('An unknown error occurred.', headers);
  assert.strictEqual(delay, 5000);
});

test('parseRetryDelayMs - should return negative delay if negative header value provided', (t) => {
  // Although ideally it shouldn't be negative, this documents current behavior
  const headers = new Map();
  headers.set('retry-after', '-5');
  const delay = parseRetryDelayMs('An unknown error occurred.', headers);
  assert.strictEqual(delay, -5000);
});

test('delay - should resolve after the specified time', async (t) => {
  const { delay } = require('../api_client.js');

  const startTime = Date.now();
  const delayMs = 100;

  await delay(delayMs);

  const elapsedTime = Date.now() - startTime;

  // Set a reasonable tolerance window because setTimeout isn't perfectly exact
  assert.ok(elapsedTime >= delayMs - 10, `Elapsed time ${elapsedTime}ms should be at least ~${delayMs}ms`);
  assert.ok(elapsedTime < delayMs + 100, `Elapsed time ${elapsedTime}ms should not significantly exceed ${delayMs}ms`);
});

test('extractReasoning - should return structuredReasoning and original text if no tags are present', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('some raw text', 'this is structured reasoning');
  assert.deepStrictEqual(result, { text: 'some raw text', reasoning: 'this is structured reasoning' });
});

test('extractReasoning - should extract reasoning from <think> tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<think>I need to do X</think> And then Y');
  assert.deepStrictEqual(result, { text: 'And then Y', reasoning: 'I need to do X' });
});

test('extractReasoning - should handle multiline reasoning in <think> tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<think>\nLine 1\nLine 2\n</think>\nFinal answer');
  assert.deepStrictEqual(result, { text: 'Final answer', reasoning: 'Line 1\nLine 2' });
});

test('extractReasoning - should extract reasoning from <thought> tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<thought>I need to do X</thought> And then Y');
  assert.deepStrictEqual(result, { text: 'And then Y', reasoning: 'I need to do X' });
});

test('extractReasoning - should combine structuredReasoning and extracted tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<think>tag reasoning</think> some text', 'structured');
  assert.deepStrictEqual(result, { text: 'some text', reasoning: 'structured\n\ntag reasoning' });
});

test('extractReasoning - should handle multiple tag traces', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<think>part 1</think> middle <think>part 2</think> end');
  assert.deepStrictEqual(result, { text: 'middle  end', reasoning: 'part 1\n\npart 2' });
});

test('extractReasoning - should handle unclosed reasoning tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('Some text before <think>unclosed thought process...');
  assert.deepStrictEqual(result, { text: 'Some text before', reasoning: 'unclosed thought process...' });
});

test('extractReasoning - should handle empty or missing inputs gracefully', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result1 = extractReasoning(null, null);
  assert.deepStrictEqual(result1, { text: '', reasoning: '' });

  const result2 = extractReasoning(undefined, undefined);
  assert.deepStrictEqual(result2, { text: '', reasoning: '' });
});

test('extractReasoning - should ignore empty tags', (t) => {
  const { extractReasoning } = require('../api_client.js');
  const result = extractReasoning('<think></think> <thought>   </thought> Final answer');
  assert.deepStrictEqual(result, { text: 'Final answer', reasoning: '' });
});
