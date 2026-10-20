const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('radar charts keep the minimum questionnaire rating visible', () => {
  assert.match(
    appSource,
    /r:\s*{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*suggestedMin:\s*0,\s*suggestedMax:\s*6,/
  );
});

