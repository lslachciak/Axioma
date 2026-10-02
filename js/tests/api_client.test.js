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


test('completeChat - Anthropic omits temperature when reasoning is enabled', async (t) => {
  const { completeChat } = require('../api_client.js');
  let fetchArgs = null;
  global.fetch = async (url, options) => {
    fetchArgs = { url, options };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Anthropic response' }],
        usage: { input_tokens: 10, output_tokens: 10 }
      })
    };
  };

  const config = {
    provider: 'anthropic',
    model: 'claude-test',
    temperature: 0.7,
    enableReasoning: true,
    reasoningBudget: 1024,
    apiKey: 'test'
  };

  await completeChat(config, [{ role: 'user', content: 'test' }]);
  
  const payload = JSON.parse(fetchArgs.options.body);
  assert.strictEqual(payload.temperature, undefined, 'Temperature should be omitted when reasoning is enabled');
  assert.ok(payload.thinking, 'Thinking config should be present');

  global.fetch = undefined;
});

test('completeChat - Anthropic includes temperature when reasoning is disabled', async (t) => {
  const { completeChat } = require('../api_client.js');
  let fetchArgs = null;
  global.fetch = async (url, options) => {
    fetchArgs = { url, options };
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Anthropic response' }],
        usage: { input_tokens: 10, output_tokens: 10 }
      })
    };
  };

  const config = {
    provider: 'anthropic',
    model: 'claude-test',
    temperature: 0.7,
    enableReasoning: false,
    apiKey: 'test'
  };

  await completeChat(config, [{ role: 'user', content: 'test' }]);
  
  const payload = JSON.parse(fetchArgs.options.body);
  assert.strictEqual(payload.temperature, 0.7, 'Temperature should be included when reasoning is disabled');
  assert.strictEqual(payload.thinking, undefined, 'Thinking config should be omitted');

  global.fetch = undefined;
});

test('completeChat - OpenAI compatible API does not hardcode Gemini fallback', async (t) => {
  const { completeChat } = require('../api_client.js');
  let fetchCalls = 0;
  global.fetch = async (url, options) => {
    fetchCalls++;
    // Simulate a failure on the custom proxy
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Not found on proxy" } }),
      headers: new Map()
    };
  };

  const config = {
    provider: 'gemini',
    baseUrl: 'https://my-custom-proxy.com/v1/chat/completions',
    model: 'gemini-1.5-pro',
    apiKey: 'test',
    maxRetries: 0 // avoid sleep loop
  };

  try {
    await completeChat(config, [{ role: 'user', content: 'test' }]);
    assert.fail('Should have thrown an error');
  } catch (err) {
    assert.match(err.message, /Not found on proxy/);
  }
  
  // fetch should only be called once, no fallback to generativelanguage.googleapis.com
  assert.strictEqual(fetchCalls, 1);

  global.fetch = undefined;
});
