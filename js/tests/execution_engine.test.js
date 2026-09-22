const test = require('node:test');
const assert = require('node:assert');
const { buildSystemPrompt } = require('../execution_engine.js');

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
