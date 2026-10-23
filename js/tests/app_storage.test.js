const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('system prompts are never read from or written to localStorage', () => {
  assert.doesNotMatch(appSource, /localStorage\.getItem\(['"]axioma_(?:custom_)?system_prompt['"]\)/);
  assert.doesNotMatch(appSource, /localStorage\.setItem\(['"]axioma_(?:custom_)?system_prompt['"]\s*,/);
  assert.doesNotMatch(appSource, /savePersistedOption\(['"]system_prompt['"]\s*,/);
});

test('obsolete persisted system prompts are removed without reading them', () => {
  assert.match(appSource, /localStorage\.removeItem\(['"]axioma_system_prompt['"]\)/);
  assert.match(appSource, /localStorage\.removeItem\(['"]axioma_custom_system_prompt['"]\)/);
});

test('batch and sequential prompts keep independent in-memory customization state', () => {
  assert.match(appSource, /systemPrompts:\s*\{\s*batch:\s*\{[\s\S]*?customized:\s*false[\s\S]*?sequential:\s*\{[\s\S]*?customized:\s*false/);
  assert.match(appSource, /return state\.systemPrompts\[state\.mode\]/);
  assert.match(appSource, /promptState\.customized = true/);
  assert.match(appSource, /promptState\.customized = false/);
  assert.doesNotMatch(appSource, /isDefaultSystemPrompt/);
});

test('API keys are session-only unless persistence is explicitly enabled', () => {
  assert.match(appSource, /rememberApiKey:\s*false/);
  assert.match(appSource, /state\.rememberApiKey = localStorage\.getItem\(`axioma_remember_key_\$\{provider\}`\) === ['"]true['"]/);
  assert.match(appSource, /state\.rememberApiKey \? \(localStorage\.getItem\(`axioma_key_\$\{provider\}`\)/);
  assert.match(appSource, /if \(state\.rememberApiKey && key && key\.trim\(\)\)/);
  assert.match(appSource, /localStorage\.removeItem\(['"]axioma_remember_api_keys['"]\)/);
  assert.match(appSource, /clearUnconsentedApiKeys\(\)/);
});

test('API key persistence consent follows the selected provider', () => {
  assert.match(appSource, /const preferenceKey = `axioma_remember_key_\$\{state\.provider\}`/);
  assert.match(appSource, /localStorage\.setItem\(preferenceKey, ['"]true['"]\)/);
  assert.match(appSource, /localStorage\.removeItem\(`axioma_key_\$\{state\.provider\}`\)/);
  assert.match(appSource, /loadProviderSettings\(state\.provider\)/);
});
