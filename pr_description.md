🔒 Fix DOM-based XSS vulnerability via innerHTML

🎯 **What:** Removed the vulnerable `innerHTML` assignment property from the `el` helper function in `js/app.js`.
⚠️ **Risk:** The use of `element.innerHTML = props[key]` within a generic element builder allows for DOM-based Cross-Site Scripting (XSS). If any malicious user input or unchecked configuration values were passed in through properties to `el`, an attacker could inject arbitrary JavaScript to execute in the victim's browser, potentially leading to unauthorized actions or data theft.
🛡️ **Solution:** Removed the `innerHTML` configuration capability entirely. Since the application components pass DOM nodes and text as distinct children (using `appendChild`), the UI remains completely functional without it. This ensures all props are either handled securely as attributes, styles, classes, etc., or converted into inert text instead of executable HTML.
