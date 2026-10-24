const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Read version.js
const versionCode = fs.readFileSync(path.join(__dirname, '../version.js'), 'utf8');
const versionExports = {};
new Function('exports', versionCode)(versionExports);
const APP_VERSION = versionExports.APP_VERSION;

global.window = { AXIOMA_VERSION: APP_VERSION };

const PVQData = require('../pvq_data.js');
const { buildSystemPrompt, EvaluatorEngine } = require('../execution_engine.js');

test('buildSystemPrompt - returns default English prompt when no custom prompt is provided', (t) => {
  const result = buildSystemPrompt(null, 'en');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.en);
});

test('buildSystemPrompt - returns default Polish prompt when no custom prompt is provided and lang is pl', (t) => {
  const result = buildSystemPrompt(null, 'pl');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.pl);
});

test('buildSystemPrompt - uses the shared default instruction in sequential mode', () => {
  const result = buildSystemPrompt(null, 'en', 'sequential');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.en);
  assert.match(result, /For each description, respond with the corresponding number \(1-6\)\./);
  assert.match(result, /6 - Very much like me$/);
  assert.doesNotMatch(result, /\bonly\b/i);
});

test('buildSystemPrompt - uses the shared Polish default in sequential mode', () => {
  const result = buildSystemPrompt(null, 'pl', 'sequential');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.pl);
  assert.match(result, /Dla każdego opisu podaj numer \(1-6\)/);
  assert.match(result, /6 - bardzo podobny do mnie$/);
});

test('PVQ-RR item wording matches the authorized male English and Polish forms', () => {
  assert.strictEqual(PVQData.ITEMS[30].pl, 'Jest dla niego ważne, aby postępować zgodnie z regułami, nawet gdy nikt tego nie widzi.');
  assert.strictEqual(PVQData.ITEMS[32].en, 'It is important to him to follow his family’s customs or the customs of a religion.');
  assert.strictEqual(PVQData.ITEMS[35].en, 'It is important to him to enjoy life’s pleasures.');
  assert.strictEqual(PVQData.ITEMS[43].en, 'It is important to him to own expensive things that show his wealth');
  assert.strictEqual(PVQData.ITEMS[51].en, 'It is important to him that everyone be treated justly, even people he doesn’t know.');
  assert.strictEqual(PVQData.ITEMS[56].pl, 'Jest dla niego ważne, aby akceptować ludzi, nawet, gdy się z nimi nie zgadza.');
});

test('buildSystemPrompt - keeps custom prompts unchanged in sequential mode', () => {
  const result = buildSystemPrompt('  My original questionnaire prompt  ', 'en', 'sequential');
  assert.strictEqual(result, 'My original questionnaire prompt');
});

test('buildSystemPrompt - returns default English prompt when lang is undefined or not pl', (t) => {
  const result = buildSystemPrompt(null);
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.en);
});

test('buildSystemPrompt - returns trimmed custom prompt when a valid custom prompt is provided', (t) => {
  const result = buildSystemPrompt("   Custom prompt here!   ", 'en');
  assert.strictEqual(result, "Custom prompt here!");
});

test('buildSystemPrompt - handles whitespace-only custom prompt by returning default', (t) => {
  const result = buildSystemPrompt("   \n\t  ", 'en');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.en);
});

test('buildSystemPrompt - returns default prompt when custom prompt is empty string', (t) => {
  const result = buildSystemPrompt("", 'pl');
  assert.strictEqual(result, PVQData.SYSTEM_PROMPTS.pl);
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
    llmQueries: {},
    parsedItemScores: {},
    reasoningTraces: {},
    parsedFragments: {},
    apiExchanges: [],
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

test('batch mode stores full output at exchange level and item parsing fragments separately', async () => {
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
    llmQueries: {},
    parsedItemScores: {},
    reasoningTraces: {},
    parsedFragments: {},
    apiExchanges: [],
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalReasoningTokens: 0
  };

  await engine._runBatch('en', 'System prompt', null, null, state);

  assert.strictEqual(state.rawResponses[1], '');
  assert.strictEqual(state.parsedFragments[1], 'Item 1: 5');
  assert.strictEqual(state.parsedFragments[2], 'Item 2: 4');
  assert.strictEqual(state.reasoningTraces[1], '');
  assert.strictEqual(state.reasoningTraces[2], '');
  assert.strictEqual(state.reasoningTraces[3], '');
  assert.strictEqual(state.apiExchanges.length, 1);
  assert.strictEqual(state.apiExchanges[0].response, 'Item 1: 5\nItem 2: 4\nItem 3: 3');
  assert.strictEqual(state.apiExchanges[0].reasoning, 'Here is the reasoning for the entire batch');
  assert.deepStrictEqual(state.apiExchanges[0].itemIds, [1, 2, 3]);
  
  // Check token counts
  assert.strictEqual(state.totalPromptTokens, 10);
  assert.strictEqual(state.totalCompletionTokens, 10);
  assert.strictEqual(state.totalReasoningTokens, 5);
});

test('sequential mode creates one complete exchange per item', async () => {
  const apiClient = {
    completeChat: async (config, messages) => ({
      text: messages.at(-1).content.includes('1') ? '4' : '5',
      reasoning: 'item reasoning',
      actualModel: 'test-model',
      systemFingerprint: 'fp_test',
      tokenUsage: { promptTokens: 2, completionTokens: 1, reasoningTokens: 1 }
    })
  };
  const psychometrics = {
    parseItemResponse: text => ({ score: Number(text), isRefusal: false }),
    calculatePsychometrics: () => ({})
  };
  const pvqData = { ITEMS: [{ id: 1, en: 'Item 1', pl: 'Pozycja 1' }, { id: 2, en: 'Item 2', pl: 'Pozycja 2' }] };
  const engine = new EvaluatorEngine({ mode: 'sequential', keepContext: true, model: 'requested-model' }, pvqData, psychometrics, apiClient);
  const result = await engine.run();

  assert.strictEqual(result.apiExchanges.length, 2);
  assert.deepStrictEqual(result.apiExchanges.map(exchange => exchange.itemIds), [[1], [2]]);
  assert.deepStrictEqual(result.apiExchanges.map(exchange => exchange.response), ['4', '5']);
  assert.strictEqual(result.apiExchanges[1].query.includes('CONVERSATION HISTORY'), true);
  assert.deepStrictEqual(result.parsedFragments, { 1: '4', 2: '5' });
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
  assert.strictEqual(result.appVersion, APP_VERSION);
  assert.strictEqual(result.metadata.actualModel, 'gpt-4o-2024-08-06');
  assert.strictEqual(result.metadata.systemFingerprint, 'fp_44709d6fcb');
  assert.strictEqual(result.metadata.appVersion, APP_VERSION);
});

test('stop aborts an active provider request', async () => {
  let observedSignal;
  const apiClient = {
    completeChat: config => new Promise((resolve, reject) => {
      observedSignal = config.signal;
      config.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })
  };
  const psychometrics = { parseBatchResponse: () => ({}), calculatePsychometrics: () => ({}) };
  const pvqData = { ITEMS: [{ id: 1, en: 'Item 1', pl: 'Pozycja 1' }] };
  const engine = new EvaluatorEngine({ mode: 'batch' }, pvqData, psychometrics, apiClient);
  const pending = engine.run();

  await new Promise(resolve => setImmediate(resolve));
  engine.stop();

  assert.strictEqual(observedSignal.aborted, true);
  await assert.rejects(pending, /Evaluation aborted/);
});

