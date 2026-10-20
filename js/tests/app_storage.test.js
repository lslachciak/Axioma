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
