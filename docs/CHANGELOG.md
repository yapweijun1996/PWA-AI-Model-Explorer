# Changelog

## 1.0.0 — static PWA refactor

Replaces the V5 single-file prototype with independent data, UI, chart, storage
and service-worker modules. Adds six bilingual learning cards, local notes,
progress and backup, coherent filter/export logic, explicit update UI, scoped
offline caching, static Pages deployment guidance, responsive cards and
accessible dialogs.

Corrections include the ineffective >=80 tok/s preset, median membership not
being shared with the table, unavailable metrics passing numeric filters,
checkbox focus being destroyed by table replacement, note load/edit races,
and unnecessary permanent multi-row sticky filters.

Model values are retained from V5. No live benchmark refresh is claimed.
