Visual regression tests

This folder contains Playwright-based visual tests and baseline images.

How to run:
- Install dependencies: `npm ci` and `npx playwright install chromium`
- Create baseline screenshots (if you intentionally changed UI): `npm run visual:create-baseline`
- Run visual tests and compare: `npm run visual:test`

Guidance:
- The tests attempt to stabilize rendering by disabling transitions/animations and waiting for images to finish loading.
- If you make UI changes intentionally, regenerate the baseline and commit the new images.
	- Regenerate baseline locally on the same OS as you expect CI to use (Ubuntu vs macOS) to minimize differences.
	- To update baseline images, run: `npm run visual:create-baseline`, verify screenshots and commit `tests/visual/baseline/*`.
- CI will upload baseline, latest and diff screenshots as artifacts.
- If tests keep failing due to rendering inconsistencies across platforms (macOS vs Ubuntu), consider regenerating baselines in the target environment or adjust tolerance in `visual-test.js`.
	- If you want to accept intentional UI changes in a PR, re-run `npm run visual:create-baseline` and commit the new baseline; CI will then compare using the updated images in the repo.
