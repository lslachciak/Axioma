🔒 Fix: Obfuscate API Key in LocalStorage

🎯 **What:**
The application previously stored user API keys in plaintext within browser `localStorage`.

⚠️ **Risk:**
Storing secrets in plaintext in `localStorage` makes them highly vulnerable to XSS (Cross-Site Scripting) attacks or unauthorized access if someone inspects the browser data. If scraped, these API keys could be misused, leading to unexpected billing or data exposure for the user.

🛡️ **Solution:**
Implemented a basic obfuscation mechanism using XOR string manipulation and Base64 encoding. While not true encryption (which would require a secure backend/key management), this mitigates casual scraping and simple exposure. We updated the `loadProviderSettings` and `saveApiKeyForProvider` functions to automatically obfuscate and deobfuscate the keys as they are read/written. We also added corresponding tests in `js/tests/obfuscation.test.js` to ensure stability and correctness.
