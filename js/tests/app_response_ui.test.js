const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

test('response helpers load before the application UI', () => {
  const helperIndex = indexSource.indexOf('js/response_view.js');
  const appIndex = indexSource.indexOf('js/app.js');

  assert.ok(helperIndex >= 0);
  assert.ok(appIndex > helperIndex);
});

test('Items & Responses exposes batch and sequential raw output controls', () => {
  assert.match(appSource, /Batch Raw Output/);
  assert.match(appSource, /View Full Response/);
  assert.match(appSource, /View Raw/);
  assert.match(appSource, /Full Raw Response/);
  assert.match(appSource, /Copy Raw Response/);
});
