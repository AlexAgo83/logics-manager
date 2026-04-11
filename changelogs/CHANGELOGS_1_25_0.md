# Changelog `1.24.0 → 1.25.0`

> Released 2026-04-11 — 28 commits since `v1.24.0`.

## New Features

- **Manual status selector** — a button in the detail panel lets users set item status without editing the source file. (`44eacf3`, `8d9039d`, `5c99c68`)
- **Insights velocity counter** — the traceability panel now tracks and displays delivery velocity metrics. (`b664ba2`)
- **Auto-bootstrap `AGENTS.md` and `LOGICS.md`** — the bootstrapper creates and maintains these files automatically in new projects. (`89bcf47`)

## Improvements

- **Traceability delivery finalized** — index generation, relationship mapping, modularization plan, and ADR notes are all part of the traceability workflow. (`8530048`, `cec1172`, `b5884f2`, `7b9c560`)
- **Items sorted newest-first by default** — the list view now orders items with the most recent at the top. (`b59ac8f`)
- **Details collapsed by default in list mode** — reduces visual noise when browsing large backlogs. (`64715ae`)
- **Simplified card layout** — tighter borders and flow in card components. (`29c0855`)
- **Webview selectors expanded** — additional selectors and improvements to `webviewSelectors.js`, with updated test coverage. (`ae14116`)
- **Gated environment checks by launcher** — environment validation now only runs when the appropriate launcher is active. (`98cafb1`)

## Bug Fixes

- **Scroll position preserved on resize** — scroll state is now clamped and restored correctly when panel dimensions are unavailable. (`d002901`, `2130b2b`)
- **Items no longer disappear on panel resize or close** — fixed a regression where list items would vanish when the detail panel was resized or collapsed. (`f409808`)

## Infrastructure

- Updated `logics-skills`, bootstrapper, and kit submodule pointers. (`f5777b1`, `17c749f`, `50e44ed`)
- Added req_150–160 and backlog items 276–289 to the spec corpus. (`dbafa49`, `89bcf47`, `56c6d76`, `22028dd`, `4e8454c`, `f81c43c`, `218d113`)

## Validation and Regression Evidence

- Add validation commands or evidence here before publishing the release.
