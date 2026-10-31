# Context interventions: implementation plan

Date: 2026-10-31

## Objective

Add **Context interventions** to sequential evaluation, with two capabilities:
start a run using supplied answers, and replace selected answers in the history
shown to subsequent requests.

The central requirement is to distinguish **what the target model actually
answered** from **what Axioma placed in its conversation history**.

## 1. Define the first release

Support three configurations:

| Configuration | Behavior |
|---|---|
| Baseline | Existing sequential evaluation with history, with randomization off for matched experiment comparisons |
| Supplied prefix | Insert question–answer pairs for item IDs 1–N from a selected run, optionally edit their ratings, then ask the target model items N+1–57 |
| History replacement | Ask the target model normally, but replace selected answers in the history used for later questions; retain the original answers separately |

For example, supplying Astra’s first 19 answers to Luna would produce 38 new Luna
responses. Replacing Luna’s answer to an early power-related item would preserve
its actual response while exposing the replacement to subsequent requests.

Require sequential mode, conversation history, and fixed questionnaire order
1–57 for context interventions. Keep batch intervention outside the first release.
Retain the Randomize Order checkbox for ordinary runs.

## 2. Add experiment setup and preview

Extend `js/app.js` with:

- Source selection from the current session or a separately imported CSV/XLSX
  file, without replacing the active session.
- Prefix length, defaulting to 19.
- Disable and display Randomize Order as unchecked while context interventions
  are enabled, with a short explanation that interventions use fixed order 1–57.
  Preserve the ordinary-run preference separately so it can be restored when
  interventions are disabled.
- An editor showing item ID, questionnaire wording, mapped value, original
  rating, and supplied rating.
- Selection of individual history replacements.
- A preview of the supplied conversation and remaining question order.
- An experiment label.
- A compact preview of the selected donor's persisted 19-value profile, retained
  as a snapshot with each new prefix run for later visual comparison.

Validate unique item IDs, integer ratings from 1–6, compatible questionnaire
language, and at least one remaining target question. Missing source ratings must
require correction or a shorter prefix; never fill them automatically.

Items 1–19 cover each of the 19 refined values once. Show value coverage for the
selected prefix length.

## 3. Introduce an explicit experiment data format

Add a small browser/Node-compatible module, such as
`js/context_intervention.js`, for validation and conversation construction.

Persist:

- Experiment schema version, experiment ID, run ID, and condition.
- Source-run reference and available donor model/configuration metadata,
  including its randomization setting and original item order when available.
- An immutable snapshot of the supplied items and ratings.
- A snapshot of the donor's existing profile metrics and item ratings.
- Exact item order and resolved system prompt.
- Per-item provenance: target response, donor-supplied answer, or manual
  intervention.
- Original target response and effective history response where they differ.
- Exact supplied message text and intervention position.

Copy only allowlisted source metadata; do not copy credentials or entire nested
source runs. Imported legacy runs should remain usable without inventing missing
provenance or order.

## 4. Extend sequential execution

Modify `js/execution_engine.js`.

For a supplied prefix:

- Build ordinary `user` question / `assistant` answer pairs.
- Use canonical numeric answers initially, avoiding donor reasoning or
  explanation as an additional experimental variable.
- Skip API calls for supplied items.
- Continue with the remaining items and normal history accumulation.

For history replacement:

- Preserve and parse the real API response.
- Append the configured replacement to conversation history.
- Apply it only to subsequent requests.

Supplied answers must not create fictitious API exchanges or completion-token
usage. Their text will still contribute to actual prompt-token usage.

Preserve cancellation and retries. Freeze the configuration at Start and create
fresh history for every iteration.

Enforce fixed item order in the engine as well as the UI. Reject intervention
configurations with randomization enabled before making any API calls, and
persist the effective configuration with `randomizeOrder: false`.

Keep provider-specific handling in `js/api_client.js`; its existing message-role
adapters should support this feature.

## 5. Use fixed item order for context interventions

The engine currently shuffles using `Math.random()` only when Randomize Order is
checked. Otherwise, sequential evaluation follows questionnaire order 1–57. The
provider seed does not control questionnaire order.

All intervention runs use fixed order 1–57. “First 19 answers” therefore means
answers to item IDs 1–19, followed by target-model requests for items 20–57.
Researchers preparing baseline runs for comparison must also turn randomization
off and align the other experimental settings themselves.

Match donor ratings by item ID, regardless of their source order. If a donor run
used randomized order, preserve and display that fact: replaying its ratings in
fixed order does not recreate its original conversation. Legacy imports without
source-order information remain usable as donors, but mark that information as
unknown rather than assuming fixed order.

Continue recording the full effective item order in experiment results and
exports for traceability. The first release does not need an order-selection UI,
a seeded shuffle, or reusable randomized-order configurations. Ordinary runs
retain their existing randomization behavior.

## 6. Keep scoring and interpretation accurate

Preserve `js/psychometrics.js`, questionnaire content, mappings, and formulas.

Recommended first-release policy:

- Score actual target responses only.
- Store supplied ratings separately.
- Label prefix runs as partial target-response results.
- Retain existing missing-value and completeness rules.
- Show supplied and observed answers distinctly in results, progress, and
  exports.
- Show an item-by-item comparison of actual target, donor, and supplied history
  ratings. Preserve missing responses and hide empty radar charts when target
  value means cannot be calculated; do not combine donor and target scores.

**Consequently, a 19-answer prefix leaves only 38 target responses: the existing
scoring rules will not produce a complete MRAT-corrected profile.** This is an
important research-design decision, not something to bypass by silently mixing
donor ratings into the target profile.

For history-replacement runs, retain all actual target ratings for scoring and
clearly label the intervention condition. Any future combined-profile view should
be separately specified and persisted.

## 7. Extend exports and response inspection

Update `js/export.js`, `js/response_view.js`, and the results UI together.

Preserve existing column names and meanings. Add intervention metadata,
provenance, effective history answers, and item order to CSV/XLSX, with
corresponding JSON/TSV support.

Ensure new exports round-trip without losing the experiment definition. Keep
older exports importable, preserve spreadsheet formula protection, and split long
intervention records where necessary to respect Excel’s cell limit.

## 8. Verify with focused acceptance tests

Cover these behaviors:

- A 19-item prefix creates 38 target requests; the first contains the 19 supplied
  pairs for items 1–19 followed by item 20, and execution continues through item 57.
- Intervention setup disables randomization; the engine rejects conflicting
  configurations before any API call. Every intervention iteration uses fixed
  order 1–57, while ordinary runs retain their randomization behavior.
- Donor answers are matched by item ID even when the source order differs;
  randomized or unknown donor order remains visible in metadata and exports.
- A history replacement affects later requests while preserving the actual
  response and score.
- Source runs remain unchanged, and iterations do not share mutable history.
- Invalid ratings, duplicate items, incompatible modes, and missing source
  answers are rejected.
- Provider adapters preserve message order and roles across all supported
  providers.
- Cancellation interrupts requests and queued retries.
- CSV/XLSX round-trips preserve intervention data; legacy fixtures still import.
- Numerical regression checks verify that supplied ratings do not enter target
  scoring.

Before committing, run:

```bash
node --test js/tests/*.test.js tests/api_client.test.js
node tests/psychometrics.test.js
```

Also run `node --check` on every changed JavaScript file and manually verify
local-file and static-hosted operation.

## 9. Deliver and pilot

Implement in this order:

1. Data contract and validation.
2. Engine.
3. Setup and inspection UI.
4. Exports/imports.
5. Verification and README.

Use a dedicated branch. As a substantial feature, bump the current `v1.6.4` to
`v1.7.0` once when preparing the implementation PR, assuming the base version
remains unchanged.

For the research pilot, use matched conditions: baseline, replayed target-model
prefix, donor prefix, and the same prefix with selected ratings changed. Keep
order, prompt, language, and generation settings aligned.

Prediction rules and evaluation criteria should be agreed before collecting
continuation responses. The first release should capture the intervention and
observations; built-in prediction metrics can follow once their definitions and
persisted format are agreed.

## Implementation status

Implemented in v1.7.0. Verification passed: 148 automated tests, 39 legacy
psychometrics checks, and syntax checks for all nine changed JavaScript files.
Browser checks covered local-file and static-hosted operation, donor import,
prefix and replacement runs, donor previews, item comparisons, and session reload
using mocked provider responses.
Live provider calls and the research pilot have not been performed.

### Final profile visualization

Completed supplied-prefix runs display donor and final radars side by side. The final profile combines supplied ratings (including edits) with actual target continuation using unchanged scoring formulas. Persist this separately as `combinedPsychometrics` in experiment records, retaining target-only scores. Reconstruct it when importing older prefix records. Missing continuation ratings remain missing. History replacement continues to score actual target answers.
