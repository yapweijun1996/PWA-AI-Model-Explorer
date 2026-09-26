# Test report — Model Explorer 1.0.0

## Measured result

**17/17 domain tests and 14/14 browser acceptance checks passed.** Syntax, dataset-schema, unique-ID and static DOM-reference checks also passed. This is a measured acceptance result, not a claim of universal PWA certification or compatibility with every browser.

The packaged runtime matches the browser-tested build **d847324d5125**, version **1.0.0**. `evidence/runtime-parity.json` records matching SHA-256 hashes for runtime code, CSS, the dataset and vendored Chart.js.

## Environment and method

Browser tests ran on an isolated Linux workstation using Google Chrome **153.0.8010.52**, Playwright **1.57.0**, and Python **3.12**. They served the built release at a localhost **/models/** subpath to exercise repository-relative URLs. The initial working container could not open local browser test pages due to its environment policy, so real browser acceptance was performed on the independent workstation instead. That restriction was not bypassed.

Viewports: desktop 1440×1000, tablet 834×1112, mobile 390×844, and narrow mobile 320×740. Mobile checks used Chromium viewport emulation, not physical iOS devices.

The test exercised actual Chart.js rendering, browser storage, a registered Service Worker, real offline reload, and a second build at version **1.0.1** (fixture build **cca0524d9f86**). The old page stayed open until explicit user approval; after activation and reload, saved notes and selections survived, this application's old cache was removed, and an unrelated cache remained untouched.

## Browser acceptance

1. PASS — Subpath launch, real Chart.js, 102 source rows and disclosed chart omissions.
2. PASS — Balanced preset actually enforces speed >=80 and all four constraints.
3. PASS — Median selection uses one shared membership for chart, table and totals.
4. PASS — Fifth selection blocked without evicting an existing selection.
5. PASS — Native comparison dialog, metric row headers, Escape and focus restoration.
6. PASS — Filters and comparison IDs survive reload; hidden selections remain explicit.
7. PASS — IndexedDB notes and learning progress persist across reload.
8. PASS — Light/dark app chrome, theme-color and charts update coherently.
9. PASS — 834px, 390px, 320px layouts: no document overflow; mobile cards and 16px inputs.
10. PASS — Real offline reload: local Chart.js, dataset, comparison and notes work.
11. PASS — N -> N+1 worker waits visibly; no silent reload.
12. PASS — Explicit update loader, activation, reload, study retention and own-cache cleanup.
13. PASS — Missing JS returns 404, never offline HTML.
14. PASS — No uncaught page errors or runtime third-party requests.

## Domain regression coverage

`tests/core.test.mjs` covers source count/completeness; case-insensitive creator/variant search; the real numeric 80 tok/s constraint; missing measurements with active filters; zero-valued filters; median null/odd/even/empty behavior; null-last sorting in both directions; Pareto ties and strict improvement; the 11-model positive-cost frontier; one shared median-view membership; complete-4D scope; log-cost omission and cost-only partial rows; rejection of a fifth selection without eviction; persisted preference validation; quoted and formula-neutralized CSV; cost precision; and invalid/duplicate/negative dataset values.

## Bugs discovered and corrected during browser testing

- Rebuilding table rows after each checkbox change destroyed the focused control. Selection now updates checkbox state and row classes in place.
- Intrinsic select widths widened the mobile filter grid to 454px on a 390px viewport. Tracks now use `minmax(0, 1fr)` and controls have `min-width: 0`; the tested viewports have no document-level horizontal overflow.
- A browser-test polling helper used string evaluation during a CSP-protected reload. The test now uses a locator text assertion; the application's Content Security Policy was **not** weakened.
- Note inputs remain disabled until their asynchronous IndexedDB read has resolved, preventing an old read from overwriting newly typed text.

The build-output safety guard was added after browser acceptance and then rechecked locally; it changes build tooling, not the tested runtime. Packaged runtime hashes and the release content fingerprint are unchanged.

## Source integrity

All 102 retained V5 rows preserve the nine original fields checked in `evidence/source-integrity.json`. Of these, 96 contain speed and first-chunk latency; two have a displayed cost of $0.00. The original larger pasted leaderboard is **not** republished in full. No fresh model benchmark or price verification is claimed.

## Remaining owner checks

Physical iPhone/iPad Safari installation, standalone system status-bar appearance, OS-specific prompts, and actual public GitHub Pages deployment have **not** been tested. No Lighthouse score, external accessibility certification, or live deployment success is claimed. Automated interaction checks are not a complete assistive-technology audit.

Review benchmark-data redistribution permission before making the supplied snapshot public. The code license does not grant rights to third-party benchmark data. Run a real-device installation check after publication.

## Reproduce

```sh
npm run check
npm test
npm run build
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:browser
```

The browser test uses temporary folders and profiles. It writes JSON and PNG evidence locally; the delivered ZIP includes the JSON evidence, but **not** screenshots from the independent workstation. Screenshots can be regenerated with the supplied test.
