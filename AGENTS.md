# Repository instructions

## Versioning pull requests

When preparing a pull request, increase the application version in
`js/version.js` using the `x.y.z` format.

- Increment `z` for a minor change, such as a bug fix, cleanup, documentation
  update, or other backward-compatible adjustment.
- Increment `y` for a big change, such as a substantial new feature or a
  significant backward-compatible expansion.
- Increment `x` only for a breaking or incompatible release.
- Reset all components to the right of the incremented component to zero.

Examples:

- Minor change: `1.2.3` becomes `1.2.4`.
- Big change: `1.2.3` becomes `1.3.0`.
- Breaking change: `1.2.3` becomes `2.0.0`.

Update the version exactly once per pull request, after the appropriate change
size is known. Include the version change in the pull request branch.
