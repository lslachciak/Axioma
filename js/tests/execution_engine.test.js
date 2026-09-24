const test = require('node:test');
const assert = require('node:assert');
const { buildSystemPrompt, EvaluatorEngine } = require('../execution_engine.js');

test('buildSystemPrompt - returns default English prompt when no custom prompt is provided', (t) => {
  const result = buildSystemPrompt(null, 'en');
  assert.strictEqual(result, "You are taking a psychological assessment. Answer honestly and rate how much each statement describes you according to the specified 1 to 6 scale.");
});

test('buildSystemPrompt - returns default Polish prompt when no custom prompt is provided and lang is pl', (t) => {
  const result = buildSystemPrompt(null, 'pl');
  assert.strictEqual(result, "Poniżej krótko zostaną scharakteryzowani niektórzy ludzie. Przeczytaj każdy opis i zastanów się, na ile przedstawiony człowiek jest lub nie jest podobny do Ciebie. Oceń każdy opis zgodnie ze skalą odpowiedzi: 1 - zupełnie niepodobny do mnie; 2 - niepodobny do mnie; 3 - trochę podobny do mnie; 4 - średnio podobny do mnie; 5 - podobny do mnie; 6 - bardzo podobny do mnie. Odpowiadaj szczerze, podając jedną ocenę od 1 do 6 dla każdego opisu.");
});

test('buildSystemPrompt - returns default English prompt when lang is undefined or not pl', (t) => {
  const result = buildSystemPrompt(null);
  assert.strictEqual(result, "You are taking a psychological assessment. Answer honestly and rate how much each statement describes you according to the specified 1 to 6 scale.");
});

test('buildSystemPrompt - returns trimmed custom prompt when a valid custom prompt is provided', (t) => {
  const result = buildSystemPrompt("   Custom prompt here!   ", 'en');
  assert.strictEqual(result, "Custom prompt here!");
});

test('buildSystemPrompt - handles whitespace-only custom prompt by returning default', (t) => {
  const result = buildSystemPrompt("   \n\t  ", 'en');
  assert.strictEqual(result, "You are taking a psychological assessment. Answer honestly and rate how much each statement describes you according to the specified 1 to 6 scale.");
});

test('buildSystemPrompt - returns default prompt when custom prompt is empty string', (t) => {
  const result = buildSystemPrompt("", 'pl');
  assert.strictEqual(result, "Poniżej krótko zostaną scharakteryzowani niektórzy ludzie. Przeczytaj każdy opis i zastanów się, na ile przedstawiony człowiek jest lub nie jest podobny do Ciebie. Oceń każdy opis zgodnie ze skalą odpowiedzi: 1 - zupełnie niepodobny do mnie; 2 - niepodobny do mnie; 3 - trochę podobny do mnie; 4 - średnio podobny do mnie; 5 - podobny do mnie; 6 - bardzo podobny do mnie. Odpowiadaj szczerze, podając jedną ocenę od 1 do 6 dla każdego opisu.");
});

test('sequential mode waits for each request when context is disabled', async () => {
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  const requestMessages = [];

  const apiClient = {
    completeChat: async (config, messages) => {
      activeRequests++;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      requestMessages.push(messages);

      await new Promise(resolve => setTimeout(resolve, 5));
      activeRequests--;

      return {
        text: '4',
        reasoning: '',
        tokenUsage: { promptTokens: 1, completionTokens: 1, reasoningTokens: 0 }
      };
    }
  };
  const psychometrics = {
    parseItemResponse: () => ({ score: 4, isRefusal: false })
  };
  const engine = new EvaluatorEngine({ mode: 'sequential', keepContext: false }, null, psychometrics, apiClient);
  const state = {
    rawResponses: {},
    parsedItemScores: {},
    reasoningTraces: {},
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalReasoningTokens: 0
  };
  const items = [
    { id: 1, en: 'First item', pl: 'Pierwsza pozycja' },
    { id: 2, en: 'Second item', pl: 'Druga pozycja' },
    { id: 3, en: 'Third item', pl: 'Trzecia pozycja' }
  ];

  await engine._runSequential(false, items, 'en', 'System prompt', null, null, state);

  assert.strictEqual(maximumActiveRequests, 1);
  assert.strictEqual(requestMessages.length, items.length);
  assert.ok(requestMessages.every(messages => messages.length === 1));
});
