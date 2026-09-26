# Architecture / 代码结构

## Goal

A local-first learning and comparison tool that can be hosted on GitHub Pages,
including a repository subpath. The interface explains measurements rather
than guessing an overall best model. No backend, login or model API is needed.

## Modules

| File | Responsibility |
|---|---|
| `index.html` | Semantic views, dialogs, form labels and app shell |
| `assets/app.css` | Responsive layout, themes, focus styles and safe areas |
| `src/core.js` | Pure schema validation, filtering, sorting, median/Pareto logic, selection and CSV |
| `src/charts.js` | Chart.js rendering and explicit omission/encoding explanations |
| `src/app.js` | UI orchestration, routes, selection, notes and learning interactions |
| `src/lessons.js` | Six bilingual lessons, questions and answer explanations |
| `src/storage.js` | Path-scoped localStorage and transactional IndexedDB |
| `src/pwa.js` | Install UI, connectivity, worker registration and explicit updates |
| `data/models.json` | Versioned, attributed user-provided benchmark snapshot |
| `scripts/build.mjs` | Vendor integrity, validation, static copy, build fingerprint and worker generation |
| `scripts/sw.template.js` | Atomic precache and repository-scoped cache lifecycle |
| `scripts/serve.mjs` | Minimal localhost static server; no asset-to-HTML fallback |
| `tests/` | Deterministic logic and actual browser acceptance tests |

## Single data pipeline

`validated snapshot → base filters → selected scope → stable sort → view`

The chart, table, mobile cards, counters and CSV receive the same `view.rows`.
The table paginates that set; its full count is not mistaken for the count on
one page. The chart can require extra measurements: every missing/zero-log
omission is counted and disclosed separately.

Median thresholds are calculated once from complete base-filter rows, then
applied. They are not repeatedly recalculated on their own winners. A Pareto
filter compares cost and intelligence only, with at least one strict
improvement. Identical points are both retained. Rounded zero costs are not
used to prove Pareto efficiency.

## Interaction contract

Filter narrows the set. Sort changes order. Select chooses up to four model
variants. Compare opens a matrix with model columns and metric row headers.
The fifth selection is blocked without replacing an existing choice. Selection
survives filtering/reload and clearly reports selected models outside filters.
Checkbox updates preserve DOM focus instead of rebuilding the table on every
check. Model names are keyboard-operable buttons opening a native dialog.

Default chart is the simpler cost/intelligence map. Four-dimensional bubbles
and the speed/latency map are deliberate optional views. Visual bands remain
consistent when filters change; exact measurements remain in the table/tooltips.
No intelligence/cost quotient or arbitrary blended recommendation score is used.

## Learning and local data

Lessons cover index, cost per task, throughput, first-chunk latency, log axes,
and trade-offs/workload validation. Correct answers save an understood flag.
Per-model notes use stable model IDs. A save is acknowledged after IndexedDB
transaction completion. Notes are disabled while the initial record loads to
avoid overwriting an edit with a late read. Unsaved notes block an app update.

Preferences use localStorage. Notes/quiz progress use IndexedDB; both are
namespaced to the repository path. Different origins/repository paths have
different browser storage. A JSON backup can be exported and imported. Imported
records are validated before one atomic write transaction. CSV formula prefixes
are neutralized. UI data is escaped before HTML insertion.

## Release boundary

The build contains no private browser records, secrets or authenticated sources.
A deterministic content fingerprint separates same-version asset changes.
`src/version.js` and `sw.js` are generated in dist, never edited manually.
The checked-in GitHub Actions workflow runs source checks, unit tests, the
build and browser acceptance tests, then uploads and deploys only `dist/` to
GitHub Pages. A release version change does not activate a waiting worker
without the user's choice.

## Non-goals

No live leaderboard promises, automatic scraping, paid inference, user account,
cross-device sync, workload-specific skill claims or production backend.
