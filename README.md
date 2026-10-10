# Axioma

**Axioma** is a browser-based research tool for the psychometric evaluation of large
language models (LLMs) using the **PVQ-RR** — the Portrait Values Questionnaire,
Revised (57 items) by Shalom H. Schwartz.

The evaluated LLM answers all 57 PVQ-RR portraits as a survey respondent. Axioma
parses the ratings, computes the profile of **19 basic human values**, applies
**grand-mean (MRAT) correction**, aggregates the **4 higher-order value groups**,
and estimates cross-iteration reliability with **ICC(3,1)**.

100% client-side (vanilla JS, no build step, CORS-safe) — runs from a local file,
static hosting, or any HTTP server.

## Features

- **Full PVQ-RR instrument** — all 57 items in English and Polish, with official
  scale wording (Cieciuch & Schwartz, 2018).
- **Two evaluation modes**
  - *Batch* — all 57 items rated in a single prompt.
  - *Sequential* — item by item, with optional conversation history.
- **Multi-provider API client** — OpenAI, Anthropic, Google Gemini, xAI (Grok),
  Ollama (local & cloud), LM Studio, vLLM, and any OpenAI-compatible endpoint.
- **Robust answer parsing** — accepts JSON, bare digits, and "Rating: 5"-style
  text; detects refusals ("As an AI, I don't have values…").
- **Reasoning support** — extracts and stores thinking traces (thinking tags,
  Gemini 3.x thoughts) with a configurable thinking budget.
- **Reproducibility controls** — temperature, seed, fixed or randomized item order.
- **Rate-limit handling** — automatic retry on HTTP 429 with `Retry-After` support.
- **Exports** — JSON, TSV, CSV and multi-sheet XLSX with full run metadata
  (requested/resolved model, system fingerprint, configuration); import of
  previous sessions from CSV/XLSX.
- **Charts** — radar and circle charts of the value profile (Chart.js).
- **Security** — DOMPurify-sanitized rendering of model output; API keys stored
  in `localStorage` with light obfuscation (see [Security notes](#security-notes)).

## Repository structure

| Path | Purpose |

|---|---|
| `index.html` | Entry point; loads CDN dependencies (Tailwind, Chart.js, SheetJS, DOMPurify) |
| `js/pvq_data.js` | 57 PVQ-RR items (EN/PL) and mappings to the 19 values |
| `js/api_client.js` | Multi-provider LLM client, retries, reasoning extraction |
| `js/execution_engine.js` | Batch vs. sequential evaluation, ordering, progress |
| `js/psychometrics.js` | Scoring: 19 value means, MRAT correction, higher-order groups, ICC(3,1), refusal detection |
| `js/export.js` | JSON/TSV/CSV/XLSX export and session import |
| `js/app.js` | UI, charts, persistence |
| `js/version.js` | Central version constant |
| `js/tests/` | Unit tests (`node:test`) |

## Getting started

1. Clone or download this repository.
2. Open `index.html` in a modern browser (no server or build step required).
3. Pick a provider, paste an API key (not needed for local endpoints), and load
   or type a model name.
4. Choose the evaluation mode, temperature, seed and item order.
5. Press **Start** — live progress, charts and export options appear as the run completes.

## Testing

```bash
node --test js/tests/              # main unit-test suite (no dependencies)
node tests/psychometrics.test.js   # legacy standalone parser tests
```

CI (GitHub Actions) runs the suite on Node 20 and 22 for every push to `main`
and every pull request.

## Security notes

- API keys never leave the browser — requests go directly from the client to
  the chosen provider.
- Keys are kept in `localStorage` with light XOR+Base64 obfuscation. This deters
  casual inspection but **is not encryption**; a browser extension or XSS can
  still recover them.
- Model output is rendered through DOMPurify.
- Do not commit session result files that contain sensitive data.

## References

- Schwartz, S. H., et al. (2012). *Refining the theory of basic individual values.* JPSP.
- Cieciuch, J., & Schwartz, S. H. (2018). *Pomiar wartości.*
- *PVQ-RR English documentation* (PDF included in this rep
o).

## License

[MIT](LICENSE)
