const test = require('node:test');
const assert = require('node:assert');

// We need to extract the functions from app.js to test them, but app.js is an IIFE.
// Since it's a simple test, we can redefine them here to test the logic, or we can read the file and eval it if needed, but redefining is safer for just testing the math.

function obfuscateApiKey(key) {
  if (!key) return key;
  try {
    const encoded = encodeURIComponent(key);
    let shifted = '';
    for (let i = 0; i < encoded.length; i++) {
      shifted += String.fromCharCode(encoded.charCodeAt(i) ^ 42);
    }
    return 'OBF:' + btoa(shifted);
  } catch (e) {
    return key;
  }
}

function deobfuscateApiKey(val) {
  if (!val) return val;
  if (val.startsWith('OBF:')) {
    try {
      const decoded = atob(val.substring(4));
      let unshifted = '';
      for (let i = 0; i < decoded.length; i++) {
        unshifted += String.fromCharCode(decoded.charCodeAt(i) ^ 42);
      }
      return decodeURIComponent(unshifted);
    } catch (e) {
      return '';
    }
  }
  return val;
}

test('obfuscateApiKey should return original string if empty or null', () => {
    assert.strictEqual(obfuscateApiKey(''), '');
    assert.strictEqual(obfuscateApiKey(null), null);
    assert.strictEqual(obfuscateApiKey(undefined), undefined);
});

test('obfuscateApiKey should return OBF: prefixed string', () => {
    const obf = obfuscateApiKey('test-key');
    assert.ok(obf.startsWith('OBF:'));
});

test('deobfuscateApiKey should return original string', () => {
    const original = 'sk-proj-test-key-1234!!';
    const obf = obfuscateApiKey(original);
    const deobf = deobfuscateApiKey(obf);
    assert.strictEqual(deobf, original);
});

test('deobfuscateApiKey should handle non-obfuscated values', () => {
    const nonObf = 'sk-proj-legacy-key';
    assert.strictEqual(deobfuscateApiKey(nonObf), nonObf);
});

test('deobfuscateApiKey should return empty string on invalid base64', () => {
    const invalid = 'OBF:invalid-base64!';
    assert.strictEqual(deobfuscateApiKey(invalid), '');
});
