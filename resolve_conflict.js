const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

// Replace both HEAD conflicts with the code from HEAD because our loop looks cleaner, but let's see which is faster...
// Actually, using new Array(length) and assignment is slightly faster than push.
// The user PR comment just said "Resolve conflicts"

// But wait, what actually happened? I wrote `for (const v of Object.values(...))` which is slightly slower than a traditional `for` loop,
// and another PR (probably the one we merged) optimized it even further using `new Array()` with pre-allocation.

// To be safe and respect the `origin/main` changes, I will resolve the conflict by keeping `origin/main`'s pre-allocated arrays, because that's generally faster in V8.

const regex1 = /<<<<<<< HEAD\n\s*const hoLabels = \[\];\n\s*const hoRaw = \[\];\n\s*const hoCentered = \[\];\n\s*for \(const v of Object\.values\(psych\.higherOrderValues\)\) \{\n\s*hoLabels\.push\(state\.lang === 'pl' \? v\.namePl : v\.nameEn\);\n\s*hoRaw\.push\(v\.rawMean \?\? 0\);\n\s*hoCentered\.push\(v\.centeredMean \?\? 0\);\n=======\n(\s*const hoVals = Object\.values\(psych\.higherOrderValues\);\n\s*const hoLen = hoVals\.length;\n\s*const hoLabels = new Array\(hoLen\);\n\s*const hoRaw = new Array\(hoLen\);\n\s*const hoCentered = new Array\(hoLen\);\n\s*for \(let i = 0; i < hoLen; i\+\+\) \{\n\s*const v = hoVals\[i\];\n\s*hoLabels\[i\] = state\.lang === 'pl' \? v\.namePl : v\.nameEn;\n\s*hoRaw\[i\] = v\.rawMean \?\? 0;\n\s*hoCentered\[i\] = v\.centeredMean \?\? 0;\n)>>>>>>> origin\/main/g;

content = content.replace(regex1, '$1');
fs.writeFileSync('js/app.js', content);
