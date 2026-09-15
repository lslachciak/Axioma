const test = require('node:test');
const assert = require('node:assert');
const { parseRetryDelayMs } = require('../js/api_client.js');

test('parseRetryDelayMs - retry-after header', (t) => {
  const headers = new Map([['retry-after', '10']]);
  assert.strictEqual(parseRetryDelayMs('', headers), 10000);
});

test('parseRetryDelayMs - retry-after header with float', (t) => {
  const headers = new Map([['retry-after', '10.5']]);
  assert.strictEqual(parseRetryDelayMs('', headers), 11000); // 10.5 rounded up to 11
});

test('parseRetryDelayMs - error text retry in seconds', (t) => {
  assert.strictEqual(parseRetryDelayMs('Rate limited. Please retry in 12s.', null), 12000);
});

test('parseRetryDelayMs - error text retry after seconds', (t) => {
  assert.strictEqual(parseRetryDelayMs('Rate limited. Please retry after 5.5s.', null), 6000);
});

test('parseRetryDelayMs - error text retry in seconds without s', (t) => {
  assert.strictEqual(parseRetryDelayMs('Rate limited. Please retry in 15.', null), 15000);
});

test('parseRetryDelayMs - error text just seconds', (t) => {
  assert.strictEqual(parseRetryDelayMs('Too many requests. 42s left.', null), 42000);
});

test('parseRetryDelayMs - fallback to default', (t) => {
  assert.strictEqual(parseRetryDelayMs('Rate limited. Please wait.', null), 5000);
});

test('parseRetryDelayMs - missing header get', (t) => {
  // Test when responseHeaders doesn't have .get
  assert.strictEqual(parseRetryDelayMs('', {}), 5000);
});

test('parseRetryDelayMs - invalid header value', (t) => {
  const headers = new Map([['retry-after', 'invalid']]);
  assert.strictEqual(parseRetryDelayMs('', headers), 5000);
});


// Edge cases for parseRetryDelayMs
test('parseRetryDelayMs - retry-after header HTTP Date', (t) => {
  // HTTP Date format, standard for Retry-After, typically requires Date parsing.
  // Our function currently parses using `parseFloat` which will result in NaN,
  // falling back to errorText parsing or default.
  // This is an interesting edge case to cover as our current implementation doesn't support Date strings.
  const headers = new Map([['retry-after', 'Wed, 21 Oct 2015 07:28:00 GMT']]);
  assert.strictEqual(parseRetryDelayMs('', headers), 5000);
});

test('parseRetryDelayMs - responseHeaders is null', (t) => {
  assert.strictEqual(parseRetryDelayMs('error', null), 5000);
});

test('parseRetryDelayMs - responseHeaders is undefined', (t) => {
  assert.strictEqual(parseRetryDelayMs('error', undefined), 5000);
});

test('parseRetryDelayMs - responseHeaders has get but returns undefined', (t) => {
  const headers = { get: () => undefined };
  assert.strictEqual(parseRetryDelayMs('error', headers), 5000);
});

test('parseRetryDelayMs - errorText is empty', (t) => {
  assert.strictEqual(parseRetryDelayMs('', null), 5000);
});

test('parseRetryDelayMs - errorText match is zero', (t) => {
  assert.strictEqual(parseRetryDelayMs('Retry in 0s', null), 5000);
});

test('parseRetryDelayMs - errorText match is negative', (t) => {
  // The regex wouldn't typically match negative numbers because it expects \d+
  // But if we could trick it, let's see. The regex uses /([\d\.]+)/ which doesn't match "-".
  assert.strictEqual(parseRetryDelayMs('Retry in -5s', null), 5000);
});

test('parseRetryDelayMs - retry-after header is zero', (t) => {
  const headers = new Map([['retry-after', '0']]);
  assert.strictEqual(parseRetryDelayMs('', headers), 0);
});

test('parseRetryDelayMs - retry-after header is negative', (t) => {
  const headers = new Map([['retry-after', '-5']]);
  assert.strictEqual(parseRetryDelayMs('', headers), -5000);
});


test('parseRetryDelayMs - errorText is undefined', (t) => {
  assert.strictEqual(parseRetryDelayMs(undefined, null), 5000);
});

test('parseRetryDelayMs - retry-after header HTTP Date logic', (t) => {
  // Let's mock Date.now to have a deterministic test
  const originalDateNow = Date.now;
  try {
    Date.now = () => new Date('Wed, 21 Oct 2015 07:27:50 GMT').getTime();

    const headers = new Map([['retry-after', 'Wed, 21 Oct 2015 07:28:00 GMT']]);
    assert.strictEqual(parseRetryDelayMs('', headers), 10000); // 10 seconds difference
  } finally {
    Date.now = originalDateNow;
  }
});
