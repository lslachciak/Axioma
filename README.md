# Axioma

**Axioma** is a browser-based research tool for generating **PVQ-RR-derived LLM
response profiles** using the Portrait Values Questionnaire, Revised (57 items) by
Shalom H. Schwartz. It is an experimental adaptation: the profiles do not establish
that an LLM possesses human values, and human psychometric validation does not
automatically transfer to language models.

The evaluated LLM answers all 57 PVQ-RR portraits as a survey respondent. Axioma
parses the ratings, computes a profile of **19 refined values**, applies
**grand-mean (MRAT) correction** only to complete 57-item runs, aggregates the
**4 core higher-order value groups**, and reports Face and Humility separately.

100% client-side (vanilla JS, no build step, CORS-safe) — runs from a local file,
static hosting, or any HTTP server.

## Features

- **Full PVQ-RR instrument** — all 57 items in English and Polish, with official
  scale wording (Cieciuch & Schwartz, 2018).
- **Two evaluation modes**
  - *Batch* — all 57 items rated in a single prompt.
  - *Sequential* — item by item, with optional conversation history and a
    shared system prompt across both evaluation modes.
- **Multi-provider API client** — OpenAI, Anthropic, Google Gemini, xAI (Grok),
  Ollama Cloud, and any OpenAI-compatible endpoint. Local OpenAI-compatible
  servers can be configured through Custom Endpoint (default:
  `http://localhost:11434/v1`) with an optional API key.
- **Robust answer parsing** — accepts JSON, bare digits, and "Rating: 5"-style
  text; detects refusals and rejects instructional placeholders or requests for
  the user to supply a rating, even when they contain example scale digits.
- **Reasoning support** — extracts and stores thinking traces (thinking tags,
  Gemini 3.x thoughts) with a configurable thinking budget.
- **Reproducibility controls** — temperature, seed, fixed or randomized item order.
- **Context interventions** — supply a donor-answer prefix or replace selected
  answers in sequential conversation history, with separate records of actual
  target responses and the answers shown to later requests.
- **Transient-error handling** — automatic retry on HTTP 429 with `Retry-After`
  support, plus cancellable 30-second Fibonacci backoff for HTTP 502, 503, and
  504 provider outages and interrupted or incomplete network responses.
  Temporary failures are retried up to 15 times, with the interval capped at
  five hours (`30s`, `30s`, `60s`, ... `3h 8m 30s`, `5h`).
- **Immediate cancellation** — Stop aborts active provider requests and queued retries.
- **Exports** — JSON, TSV, CSV and multi-sheet XLSX with full run metadata
  (requested/resolved model, system fingerprint, configuration). API exchanges
  preserve each complete query, reasoning trace, and provider response, while
  item results retain the exact fragment used for parsing. Previous session
  CSV/XLSX exports remain importable.
- **Charts** — radar and circle charts of the value profile (Chart.js). These
  charts use zero as a visual origin so that the minimum valid rating remains
  visible; questionnaire ratings themselves remain on the 1–6 scale.
- **Response inspection** — the Items & Responses tab shows each sequential
  API response directly. Batch runs expose one shared full response alongside
  per-item parsing fragments and an explicit parsing summary.
- **Security** — DOMPurify-sanitized rendering of model output; API keys remain
  session-only by default, while system-prompt edits reset on reload (see
  [Security notes](#security-notes)).

## Repository structure

| Path | Purpose |

|---|---|
| `index.html` | Entry point; loads locally vendored browser dependencies |
| `js/pvq_data.js` | 57 PVQ-RR items (EN/PL) and mappings to the 19 values |
| `js/api_client.js` | Multi-provider LLM client, retries, reasoning extraction |
| `js/execution_engine.js` | Batch vs. sequential evaluation, ordering, progress |
| `js/context_intervention.js` | Experiment validation, donor snapshots, and supplied history |
| `js/psychometrics.js` | Scoring: 19 value means, MRAT correction, higher-order groups, refusal detection |
| `js/export.js` | JSON/TSV/CSV/XLSX export and session import |
| `js/app.js` | UI, charts, persistence |
| `js/version.js` | Central version constant |
| `js/tests/` | Unit tests (`node:test`) |

## Getting started

1. Clone or download this repository.
2. Open `index.html` in a modern browser (no server or build step required).
3. Pick a provider, paste an API key when required, and load or type a model
   name. Custom Endpoint accepts an optional API key.
4. Choose the evaluation mode, temperature, seed and item order.
5. Press **Start** — live progress, charts and export options appear as the run completes.

## Context interventions

In **Sequential Mode**, choose a **Context intervention** in the evaluation
settings. Provider, model, prompt, and generation controls remain shared.

- **None (baseline):** ordinary evaluation. Enable history and disable
  randomization to create a baseline for matched experiment comparisons.
- **Supplied prefix:** select a donor run from the session or import donor runs
  from a session CSV/XLSX without replacing the current session. Choose 1–56
  answers (default 19), review their item IDs and value mappings, and optionally
  edit ratings. Axioma inserts numeric answers to items 1–N as assistant history,
  then asks the target model items N+1–57. Donor reasoning is not replayed.
- **History replacement:** choose replacement ratings before starting. Axioma
  asks all 57 questions and saves the actual answers, but replaces selected
  answers in the history used for subsequent questions. Item 57 cannot be a
  replacement because there is no subsequent question.

Interventions lock history on and question order to 1–57. Ordinary-run history
and randomization preferences are restored when the intervention is disabled.
The provider seed does not control question shuffling. Donor ratings are matched
by item ID; randomized or unknown donor order is reported rather than treated as
a replay of the original conversation. Donor and target questionnaire languages
must match. Missing donor ratings require an explicit correction or shorter
prefix; no ratings are imputed.

Use **Preview conversation** to inspect the supplied context and remaining order.
An optional baseline reference lists only sequential runs with history and a
recorded fixed order. This establishes order compatibility, not equivalence of
all experimental settings: researchers should also align language, prompt, and
generation settings. Each Start snapshots the configuration for all iterations;
each iteration starts with fresh history and receives its own run ID.

**Only actual target responses are scored.** A 19-answer prefix makes 38 target
requests and produces partial target-response results, without MRAT or centered
scores. Supplied answers do not count as target ratings or API exchanges. History
replacement preserves the original ratings for scoring. Items & Responses labels
supplied answers and displays replacements separately from actual raw responses.
Questionnaire wording, mappings, and scoring formulas are unchanged.

JSON and TSV include experiment records. CSV/XLSX add provenance fields and
chunked experiment records, preserving the exact supplied answers, source
metadata, run references, resolved system prompt, and item order on session
export/import. XLSX stores these chunks in **Experiment Records** to avoid
truncating experiment evidence at Excel's cell limit. Existing response/query
display cells may still be truncated in XLSX. Earlier session files remain
importable; missing source order and identifiers remain unknown. No new
prediction or statistical comparison metrics are calculated.

Stop cancels the active request and queued retries. Completed iterations remain
in the session; an interrupted iteration is not saved as a completed result.

## Testing

```bash
node --test js/tests/              # main unit-test suite (no dependencies)
node tests/psychometrics.test.js   # legacy standalone parser tests
```

CI (GitHub Actions) runs the suite on Node 22 and 24 for every push to `main`
and every pull request.

## Releases

Merging a pull request that updates `js/version.js` automatically creates a
matching GitHub Release and `vX.Y.Z` tag. Release notes are generated from the
merged pull requests and grouped using `.github/release.yml` labels. Existing
releases and tags are never overwritten by the workflow.

## Security notes

- API keys are sent directly from the browser to the chosen provider and remain
  in memory by default. Persistent storage is an explicit opt-in.
- Remembered keys use light XOR+Base64 obfuscation in `localStorage`. This deters
  casual inspection but **is not encryption**; a browser extension or XSS can
  still recover them. Disabling the option removes all remembered provider keys.
- Model output is rendered through DOMPurify.
- Browser libraries are pinned and stored locally, and a Content Security Policy
  prevents execution of scripts from third-party origins. Internet access is
  needed only for provider API calls.
- Spreadsheet imports are limited to 25 MB. SheetJS is kept on a release that
  includes the published prototype-pollution and ReDoS fixes.
- CSV and TSV exports neutralize formula-like cells before spreadsheet software
  can evaluate them.
- Do not commit session result files that contain sensitive data.

## References

- Schwartz, S. H., et al. (2012). *Refining the theory of basic individual values.* JPSP.
- Cieciuch, J., & Schwartz, S. H. (2018). *Pomiar wartości.*
- Schwartz, S. H., & Cieciuch, J. (2021). [PVQ-RR questionnaires and scoring
  resources](https://osf.io/w9as3/files/osfstorage?view_only=e1f02bf232c34d39b9884398b4f2df63).
  Axioma's male-form item wording and instructions are based on the repository's
  [English questionnaire](https://osf.io/download/qv39m/?view_only=e1f02bf232c34d39b9884398b4f2df63)
  and [Polish questionnaire](https://osf.io/download/26w7h/?view_only=e1f02bf232c34d39b9884398b4f2df63).
  The paper-form instruction to mark a response box is adapted to request a
  corresponding numeric response from the evaluated model.

## License

[MIT](LICENSE)
