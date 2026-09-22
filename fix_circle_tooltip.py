import re

with open('js/app.js', 'r') as f:
    content = f.read()

circle_original = """          plugins: {
            legend: {
              labels: { color: '#f8fafc', font: { size: 14 } },
              position: 'bottom'
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 14 }
            }
          }"""

circle_new = """          plugins: {
            legend: {
              labels: { color: '#f8fafc', font: { size: 14 } },
              position: 'bottom'
            },
            tooltip: {
              bodyFont: { size: 14 },
              titleFont: { size: 14 },
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) label += ': ';
                  if (context.parsed.r !== null) label += context.parsed.r.toFixed(3);
                  const dataIndex = context.dataIndex;
                  const codes = Object.keys(psych.refinedValues);
                  if (codes[dataIndex] && alphas[codes[dataIndex]] !== undefined && alphas[codes[dataIndex]] !== null) {
                    label += ` (α: ${alphas[codes[dataIndex]]})`;
                  }
                  return label;
                }
              }
            }
          }"""

content = content.replace(circle_original, circle_new)

with open('js/app.js', 'w') as f:
    f.write(content)
