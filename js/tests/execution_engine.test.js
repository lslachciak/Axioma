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

test('batch mode stores parsed raw text and single reasoning trace', async () => {
  const apiClient = {
    completeChat: async (config, messages, statusUpdateCallback, checkAbort) => {
      return {
        text: 'Item 1: 5\nItem 2: 4\nItem 3: 3',
        reasoning: 'Here is the reasoning for the entire batch',
        tokenUsage: { promptTokens: 10, completionTokens: 10, reasoningTokens: 5 }
      };
    }
  };
  
  const psychometrics = {
    parseBatchResponse: (text) => {
      return {
        1: { score: 5, rawText: 'Item 1: 5', isRefusal: false },
        2: { score: 4, rawText: 'Item 2: 4', isRefusal: false },
        3: { score: 3, rawText: 'Item 3: 3', isRefusal: false }
      };
    }
  };
  
  const pvqData = {
    ITEMS: [
      { id: 1, en: 'First item', pl: 'Pierwsza pozycja' },
      { id: 2, en: 'Second item', pl: 'Druga pozycja' },
      { id: 3, en: 'Third item', pl: 'Trzecia pozycja' }
    ]
  };
  
  const { EvaluatorEngine } = require('../execution_engine.js');
  const engine = new EvaluatorEngine({ mode: 'batch' }, pvqData, psychometrics, apiClient);
  const state = {
    rawResponses: {},
    parsedItemScores: {},
    reasoningTraces: {},
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalReasoningTokens: 0
  };

  await engine._runBatch('en', 'System prompt', null, null, state);

  // Check that rawText is correctly mapped instead of duplicating full batch text
  assert.strictEqual(state.rawResponses[1], 'Item 1: 5');
  assert.strictEqual(state.rawResponses[2], 'Item 2: 4');
  
  // Check that reasoning trace is only on the first item
  assert.strictEqual(state.reasoningTraces[1], 'Here is the reasoning for the entire batch');
  assert.strictEqual(state.reasoningTraces[2], '');
  assert.strictEqual(state.reasoningTraces[3], '');
  
  // Check token counts
  assert.strictEqual(state.totalPromptTokens, 10);
  assert.strictEqual(state.totalCompletionTokens, 10);
  assert.strictEqual(state.totalReasoningTokens, 5);
});

test('engine run attaches actualModel and systemFingerprint to metadata and result', async () => {
  const apiClient = {
    completeChat: async () => {
      return {
        text: '1: 4\n2: 4\n3: 4',
        reasoning: '',
        actualModel: 'gpt-4o-2024-08-06',
        systemFingerprint: 'fp_44709d6fcb',
        tokenUsage: { promptTokens: 5, completionTokens: 5, reasoningTokens: 0 }
      };
    }
  };
  const psychometrics = {
    parseBatchResponse: () => ({
      1: { score: 4, rawText: '1: 4', isRefusal: false }
    }),
    calculatePsychometrics: () => ({ mrat: 4.0, totalAnswered: 1 })
  };
  const pvqData = {
    ITEMS: [{ id: 1, en: 'Item 1', pl: 'Pozycja 1' }]
  };
  const engine = new EvaluatorEngine({ mode: 'batch', model: 'gpt-4o' }, pvqData, psychometrics, apiClient);
  const result = await engine.run();

  assert.strictEqual(result.actualModel, 'gpt-4o-2024-08-06');
  assert.strictEqual(result.systemFingerprint, 'fp_44709d6fcb');
  assert.strictEqual(result.metadata.actualModel, 'gpt-4o-2024-08-06');
  assert.strictEqual(result.metadata.systemFingerprint, 'fp_44709d6fcb');
});
