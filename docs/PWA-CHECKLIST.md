# PWA lifecycle and acceptance contract

This is the project's product checklist, not a universal certification. Browser
install UX varies. Automated Chromium evidence and remaining manual checks are
listed separately in TEST-REPORT.md.

## App shell and deployment

- Relative manifest ID, start_url, scope, icons and worker paths.
- Standalone display, 192/512 icons, maskable icon and Apple touch icon.
- HTTPS in production; localhost for development. file:// is not supported.
- Runtime scripts, chart library, stylesheet, icons and snapshot are same-origin.
- Root and repository-subpath layouts; hash routes avoid a server-side router.
- Visible app version and build information; imported snapshot is not marked live.

## Install and offline

- Install button uses beforeinstallprompt only when the browser provides it.
- Fallback dialog gives browser/iOS Add to Home Screen guidance.
- Standalone-installed state is reflected in the button.
- A complete initial precache is required before 'Ready offline'. First-ever
  offline access cannot create assets that have never been downloaded.
- Cache installation fails atomically if a required asset fails.
- Notes remain in IndexedDB, not release caches. Browser eviction/data clearing
  can still remove local data: backup is the supported safety mechanism.
- Online/offline badge reflects browser connectivity, not proof of internet reachability.

## Explicit update state machine

Running → checking → downloading → waiting → user confirms → updating loader
→ new worker activates → controller changes → reload → visible new version.

No automatic skipWaiting, no automatic reload of another active tab. A second
click cannot start another activation. Unsaved notes prevent updating. An
activation timeout shows a retry state without deleting study records. A waiting
update can be deferred and reopened using Check updates.

Only caches beginning with this repository's worker prefix are removed. The
worker does not touch another app's caches or IndexedDB. Missing JS/CSS/JSON
never receive offline HTML as a fake success response.

## Mobile and accessibility

- Opaque light/dark app chrome with matching theme-color.
- viewport-fit=cover and env(safe-area-inset-*) around fixed controls.
- At least 16px mobile inputs, normal pinch zoom, 44px primary touch targets.
- No sticky multi-row filter block covering the chart/table. Advanced filters
  expand in normal flow. Header hides on downward scroll and returns upward.
- Mobile cards; isolated horizontal scrolling for an explicitly selected table.
- Comparison matrix scrolls inside the dialog with metric labels retained.
- Native modal focus containment, Escape, focus restoration; reduced motion.
- Chart information also exists as text/table data; colors are not the only source.

## Manual release checklist

1. Test the actual Pages HTTPS URL after the owner publishes it.
2. Install/open on Android Chrome and iOS/iPadOS Safari, including launch icon,
   standalone chrome, safe areas, keyboard, rotation and zoom.
3. Open online, confirm Ready offline, close and reopen while offline.
4. Deploy a higher version. Confirm the old page stays stable until Update is
   pressed, then verify the new version and retained local notes.
5. Review the benchmark data's redistribution rights before making it public.

## Official references reviewed 2026-09-26

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://web.dev/articles/service-worker-lifecycle
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
