import re

with open('js/export.js', 'r') as f:
    content = f.read()

# We need to add the alphas declaration to exportSessionToXLSX.
# Because I accidentally removed both, or rather, the first occurrence was removed which happened to be the ONLY occurrence, or wait.
# Let's just insert it at the start of exportSessionToXLSX.

xls_alpha_insert = """
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    const alphas = window.Psychometrics && window.Psychometrics.calculateCronbachAlphaForSession
      ? window.Psychometrics.calculateCronbachAlphaForSession(sessionResults, window.PVQData)
      : {};
"""

content = content.replace("    const XLSX = window.XLSX;\n    const wb = XLSX.utils.book_new();", xls_alpha_insert)

with open('js/export.js', 'w') as f:
    f.write(content)
