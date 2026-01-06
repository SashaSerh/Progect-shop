PR: chore(btn): remove legacy .btn-- classes and migrate to attribute-based `.btn` API

Summary
- Removed legacy `.btn--*` CSS rules and migrated components and JS to a single `.btn` API that uses `data-variant`, `data-size`, `data-loading`, and `data-block` attributes.
- Updated documentation (`docs/*`) and examples.
- Added `tests/no-legacy-btn-classes.test.js` — a Vitest rule that fails the build if any `btn--` token remains in the repository.

Why
- Simplifies button styling and improves consistency across the app.
- Facilitates theme tuning via attribute selectors, improves maintainability.

Testing
- Ran full test suite locally: 133/133 passing.
- Added automated test preventing regressions.

Migration notes
- `normalizeButtons()` remains in `js/ui-patterns.js` to gracefully handle legacy markup at runtime.
- Docs updated; external integrators should prefer the attribute-based API going forward.

Suggested reviewers
- Frontend/UI owner
- QA (to spot-check CTAs and buttons in relevant pages)
