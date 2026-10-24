# Vendored browser dependencies

These files are committed so that Axioma can run from static hosting or directly
from `index.html` without executing third-party CDN scripts at runtime.

| File | Upstream source | SHA-256 |
|---|---|---|
| `tailwindcss-3.4.17.js` | `https://cdn.tailwindcss.com/3.4.17` | `176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15` |
| `chart.umd-4.5.1.min.js` | `https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js` | `48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a` |
| `xlsx.full-0.20.3.min.js` | `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` |
| `purify-3.4.17.min.js` | `https://cdn.jsdelivr.net/npm/dompurify@3.4.17/dist/purify.min.js` | `cd37898f9782adf54820c413191b5691803f0f137c799d6edcfd38523b4c2c31` |
| `fontawesome/css/all-6.4.0.min.css` | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css` | `1edb1725a9ea8ca4dcf2f5508cee183218aa1685e47c1b23056717f754f58ebf` |
| `fontawesome/webfonts/fa-solid-900.woff2` | Font Awesome 6.4.0 CDN | `7152a6933ee3d690ec2af3d09da9d701723d16aa3410a6d80f28ff8866f3b880` |
| `fontawesome/webfonts/fa-regular-400.woff2` | Font Awesome 6.4.0 CDN | `8e7e5ea1b15f62ab14dbd41768e8fbcd21cc859a4ea5da812457ee714299fb35` |
| `fontawesome/webfonts/fa-brands-400.woff2` | Font Awesome 6.4.0 CDN | `748332090c4b8e20f95d0ff59f0be20fa9c889359d3b36d4b886d73376054207` |

When updating a dependency, replace the file, update its versioned filename and
reference in `index.html`, and record the new source and digest here.
