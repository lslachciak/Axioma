const test = require('node:test');
const assert = require('node:assert');
const { parseRetryDelayMs } = require('../js/api_client.js');

test('parseRetryDelayMs', async (t) => {
  await t.test('returns retry-after header value in ms when provided as integer', () => {
    const headers = { get: (name) => name === 'retry-after' ? '5' : null };
    assert.strictEqual(parseRetryDelayMs('some error', headers), 5000);
  });

  await t.test('returns retry-after header value in ms rounded up when provided as float', () => {
    const headers = { get: (name) => name === 'retry-after' ? '2.3' : null };
    assert.strictEqual(parseRetryDelayMs('some error', headers), 3000);
  });

  await t.test('ignores invalid retry-after header and parses error text instead', () => {
    const headers = { get: (name) => name === 'retry-after' ? 'invalid' : null };
    assert.strictEqual(parseRetryDelayMs('Please retry in 4s', headers), 4000);
  });

  await t.test('ignores null header and parses error text', () => {
    const headers = { get: () => null };
    assert.strictEqual(parseRetryDelayMs('retry after 3.5 s', headers), 4000);
  });

  await t.test('parses "retry in X s" from error text', () => {
    assert.strictEqual(parseRetryDelayMs('Rate limited. Please retry in 1.5 s.', null), 2000);
  });

  await t.test('parses "retry after X" from error text', () => {
    assert.strictEqual(parseRetryDelayMs('Rate limited. retry after 10', null), 10000);
  });

  await t.test('parses "Xs" from error text', () => {
    assert.strictEqual(parseRetryDelayMs('Please wait 12.1s before trying again', null), 13000);
  });

  await t.test('returns default 5000ms if nothing matches', () => {
    assert.strictEqual(parseRetryDelayMs('Unknown error occurred', null), 5000);
  });

  await t.test('returns default 5000ms if negative value parsed from text', () => {
    assert.strictEqual(parseRetryDelayMs('retry in -5 s', null), 5000);
  });

  await t.test('returns default 5000ms if zero value parsed from text', () => {
    assert.strictEqual(parseRetryDelayMs('retry in 0 s', null), 5000);
  });
});
