# Changelog

## Unreleased

### chore(btn): Migrate to attribute-based `.btn` API and remove legacy `.btn--*` rules

- Replaced legacy button classes (`btn--primary`, `btn--secondary`, `btn--sm`, `btn--loading`, etc.) with attribute-based API:
  - `class="btn" data-variant="primary"` (was `class="btn btn--primary"`)
  - `data-size="sm|md|lg|..."` (was `btn--sm|btn--md`)
  - `data-loading="true"` instead of `btn--loading`
  - `data-block="true"` instead of `btn--block`
- Updated all components (`components/*.html`), JS runtime code (`js/*`), and docs (`docs/*`) accordingly.
- Removed legacy `.btn--*` CSS rules and moved theme-specific toning to attribute selectors (e.g., `.btn[data-variant="primary"]`).
- Added a Vitest check to prevent regressions: `tests/no-legacy-btn-classes.test.js` (ensures no `btn--` remains in allowed source files).

### Notes
- All tests pass locally (133/133).
- No runtime breaking changes expected: `normalizeButtons()` still supports migration in case older markup exists.

---

*Suggested PR title:* chore(btn): remove legacy .btn-- classes and migrate to attribute-based `.btn` API

*Suggested PR description:*

- Summary of change (see Unreleased entry above)
- Why: unify button API, simplify styling, and remove legacy CSS duplication
- Risk: low — runtime normalization retained; tests added to prevent regressions
- Testing: ran full test suite (133/133), and added a new test that fails if any `btn--` token appears in the codebase
- To reviewers: check components and docs for any missed examples, and verify dark theme and CTA behavior in the UI
