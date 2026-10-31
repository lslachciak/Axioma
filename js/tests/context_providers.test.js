const test = require('node:test');
const assert = require('node:assert/strict');
const { completeChat } = require('../api_client.js');

for (const provider of ['openai', 'anthropic', 'gemini', 'xai', 'ollama_cloud', 'custom']) {
  test(`${provider} preserves supplied answer roles, order and cancellation signal`, async () => {
    const originalFetch = global.fetch;
    const controller = new AbortController();
    let payload;
    let signal;
    global.fetch = async (url, options) => {
      payload = JSON.parse(options.body);
      signal = options.signal;
      return { ok: true, json: async () => ({
        choices: [{ message: { content: '2' } }],
        content: [{ type: 'text', text: '2' }],
        candidates: [{ content: { parts: [{ text: '2' }] } }], usage: {}
      }) };
    };
    const messages = [{ role: 'user', content: 'Item 1: question' },
      { role: 'assistant', content: '6' }, { role: 'user', content: 'Item 2: question' }];
    try {
      await completeChat({ provider, model: 'test-model', systemPrompt: 'Survey instructions', signal: controller.signal }, messages);
      const actual = provider === 'gemini'
        ? payload.contents.map(message => ({ role: message.role === 'model' ? 'assistant' : message.role, content: message.parts[0].text }))
        : payload.messages.filter(message => message.role !== 'system');
      assert.deepEqual(actual, messages);
      assert.equal(signal, controller.signal);
    } finally { global.fetch = originalFetch; }
  });
}
