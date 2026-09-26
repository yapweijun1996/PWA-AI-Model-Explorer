# Model Explorer

A static, local-first PWA for **learning model benchmark metrics and comparing candidates**. Refactored from the supplied V5 Chart.js page; no framework, backend, login, AI API key or runtime CDN is required.

## Start locally

Use Node.js 22 or newer. From this folder:

```sh
npm start
```

Open `http://localhost:4173`. Do not double-click index.html: file:// does not support this app's module/data loading and PWA lifecycle. `npm start` builds the release first. Vendored Chart.js is integrity checked; if missing, the build downloads a fixed, hash-verified upstream copy. Runtime assets are then served locally.

## Publish to GitHub Pages

1. Create a repository (suggested name: `AI-Model-Explorer`). Keep the supplied model data only after reviewing its redistribution terms.
2. Run the checks and build locally:

   ```sh
   npm run check && npm test && npm run build
   ```

3. Push to `main` or manually run the included `.github/workflows/pages.yml`. It runs source checks, unit tests, the build and browser acceptance tests before uploading and deploying only `dist/`.
4. Open the Pages URL from the completed workflow. The app uses relative URLs and a repository-scoped worker, so `/AI-Model-Explorer/` and custom-domain root deployments are supported.

No GitHub repository has been created or modified for you. Enable GitHub Pages with **Settings → Pages → Build and deployment → Source → GitHub Actions**. Do not publish the unbuilt source root as the site.

## What changed from V5

- Shared deterministic filter → scope → sort pipeline for the map, table, cards, counters and export. The 80 tok/s preset now actually applies.
- Readable type, non-sticky expandable filters, mobile cards, keyboard-accessible model buttons, sortable column headers and a sticky model column.
- Up to four persistent comparison selections with explicit hidden-selection status. A fifth model is rejected rather than silently replacing another.
- A native modal comparison matrix: models as columns, metrics as row headers; descriptive mini bars, no invented combined ranking.
- Cost/intelligence, 4D, speed/latency views; 2D Pareto scope and median-intersection scope. Chart exclusions are disclosed.
- Six English/Mandarin lessons with one question each, saved progress and private per-model notes.
- Local notes/progress backup import/export; filtered CSV export; comparison links contain model IDs only.
- Install guidance, visible version, offline app shell/data/vendor assets, manual update check, waiting-worker notification, explicit loader-backed activation/reload.
- Light/dark opaque chrome, safe-area spacing, 16px mobile inputs, enabled zoom, reduced motion, smart scroll header and scroll-to-top.

## Commands

```sh
npm run check          # Syntax, dataset schema and static DOM references
npm test               # Deterministic domain regression tests
npm run build          # Produce dist/ with versioned, precached assets
npm start              # Build + localhost server
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run test:browser   # Real UI, storage, offline and N→N+1 tests
npm run release -- 1.0.1
```

Tests use isolated profiles and temporary build folders. They do not overwrite your source version or real browser notes. `BROWSER_PATH` can point to a locally installed Chromium/Chrome binary.

## Public dataset notice

The included file is **the same 102 rows with index and cost retained by V5** from the user-supplied Artificial Analysis snapshot. 96 rows also have speed and first-chunk latency. It is not the full pasted leaderboard. Data is not live or independently verified; benchmark publication/as-of date was not supplied. The import date is not an assertion of freshness.

`Cost per Task` is displayed USD/task, **not API pricing per million tokens**. `First Chunk (s)` is the exact source meaning of latency. Missing values remain null. Displayed $0.00 is not proof of free usage. Model reasoning variants remain distinct.

This repository's MIT code license **does not grant a license to third-party benchmark data**. Its redistribution permission was not established. Review the provider's terms before making the snapshot public, or replace `data/models.json` with a same-schema dataset you are authorized to publish. See `docs/DATA.md` and `THIRD-PARTY-NOTICES.md`.

## Privacy and offline contract

All core exploration, charts, comparison, lessons and notes work offline after a successful online precache. First-ever offline access cannot bootstrap missing assets. Update checks and installation UI depend on browser/platform support. No requests are sent to an AI provider. Preferences and study records remain in the browser; clearing browser data can remove them. Export a backup before changing browser, device, origin or repository path.

`docs/ARCHITECTURE.md`, `docs/PWA-CHECKLIST.md`, and `docs/TEST-REPORT.md` explain design decisions and measured acceptance results. Physical iOS install/status-bar behavior and a live public Pages deployment still require owner verification.
