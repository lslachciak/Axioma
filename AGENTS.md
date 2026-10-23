# Repository instructions

## Versioning pull requests

When preparing a pull request, increase the application version in
`js/version.js` using the `vX.Y.Z` format. The leading `v` is required.

- Increment `z` for a minor change, such as a bug fix, cleanup, documentation
  update, or other backward-compatible adjustment.
- Increment `y` for a big change, such as a substantial new feature or a
  significant backward-compatible expansion.
- Increment `x` only for a breaking or incompatible release.
- Reset all components to the right of the incremented component to zero.

Examples:

- Minor change: `v1.2.3` becomes `v1.2.4`.
- Big change: `v1.2.3` becomes `v1.3.0`.
- Breaking change: `v1.2.3` becomes `v2.0.0`.

Update the version exactly once per pull request, after the appropriate change
size is known. Include the version change in the pull request branch.

## Automated GitHub releases

Every merge to `main` that changes `js/version.js` is published automatically
by `.github/workflows/release.yml` as a GitHub Release and matching `vX.Y.Z`
tag. The workflow validates the version, refuses to reuse a tag that points to a
different commit, and uses GitHub-generated release notes.

- Do not create release tags or GitHub Releases manually for normal pull
  requests.
- Keep pull request titles concise and release-note ready because they become
  part of the generated release documentation.
- Apply `security`, `dependencies`, `enhancement`, `feature`, `bug`, or `fix`
  labels when appropriate so `.github/release.yml` can categorize changes.
- Apply `skip-changelog` only when a pull request should intentionally be
  omitted from generated release notes.
- If the release workflow fails, fix or rerun it; do not move or overwrite an
  existing version tag.

## Project architecture

- Keep the application browser-based and dependency-light.
- Do not introduce a build step or framework unless the pull request explicitly
  requires and documents that architectural change.
- Preserve compatibility with static hosting and opening `index.html` directly.
- Keep browser globals and Node.js exports working because the test suite loads
  modules in Node.js.

## Required verification

Before committing or opening a pull request, run:

```bash
node --test js/tests/*.test.js tests/api_client.test.js
node tests/psychometrics.test.js
```

Also run `node --check` for every JavaScript file changed. Do not claim that
checks passed unless they were actually executed successfully.

## Psychometric integrity

- Do not change PVQ-RR items, translations, item mappings, scale values, MRAT
  correction, or aggregation formulas without explicit authorization.
- Add numerical regression tests for every scoring change.
- Do not derive, display, or export statistical metrics that are not explicitly
  part of the persisted result format.
- Preserve missing responses as missing; do not silently impute ratings.

## Provider integrations

- Keep provider-specific request logic isolated in `js/api_client.js`.
- Preserve compatibility with OpenAI, Anthropic, Gemini, xAI, Ollama Cloud, and
  custom OpenAI-compatible endpoints.
- Never include API keys in logs, exports, errors, tests, or commits.
- Add request-payload tests when changing provider options.
- Ensure active requests remain cancellable.

## Export compatibility

- Preserve backward compatibility when importing files from earlier Axioma
  versions.
- Treat CSV and XLSX column names as a public data format.
- When adding or changing exported fields, update both CSV and XLSX paths and
  their tests.
- Keep spreadsheet cells within Excel's maximum cell-length limit.

## Repository hygiene

- Do not commit generated session results, API credentials, `.env` files, or
  temporary research data.
- Treat existing untracked files as user-owned unless the task explicitly
  includes them.
- Do not overwrite or delete user result files.
- Keep unrelated changes out of the pull request.

## Pull requests

- Use a dedicated branch; do not commit directly to `main`.
- Keep commits focused and use descriptive commit messages.
- Update README documentation when behavior, supported providers, exports, or
  security characteristics change.
- Summarize tests executed and any known limitations in the pull request.
