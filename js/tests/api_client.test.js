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
