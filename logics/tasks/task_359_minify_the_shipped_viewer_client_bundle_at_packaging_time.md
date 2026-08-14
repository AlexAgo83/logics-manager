## task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time - Minify the shipped viewer client bundle at packaging time
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:58:41

# AI Context
- Summary: `scripts/build/build-assets.mjs` currently plain-copies `clients/viewer/browser-host.js` into `logics_manager/viewer_assets/viewer/` (`copyFiles`, line ~52-56); this task swaps that copy for a minifying esbuild pass so the served asset is smaller while the committed source stays untouched and readable.
- Keywords: esbuild minify, build-assets.mjs, viewer_assets, packaging pipeline
- Use when: Implementing item_787's scope.
- Skip when: Anything about ETag/gzip on the served response — that's task_358.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_787_performance_review_viewer_server_static_delivery_and_payload_transfer`

# Acceptance criteria
- AC1: The `browser-host.js` served from `logics_manager/viewer_assets/viewer/` is a minified build, measurably smaller than the current 596 KB committed source, while `clients/viewer/browser-host.js` remains unminified and its `--check` mode still passes unchanged.
- AC2: The existing viewer test suite (JS/TS tests exercising `browser-host.js` behavior) passes unmodified against the minified asset actually served.

# Plan
- [ ] In `scripts/build/build-assets.mjs`, replace the plain `copyFileSync` of `browser-host.js` with an esbuild `transform`/`build` call using `minify: true` on the already-bundled file, writing the minified output to `logics_manager/viewer_assets/viewer/browser-host.js` (source map path adjusted or dropped to match).
- [ ] Leave `browser-host.js.map`, `index.html`, `viewer.css`, and the vendor copy untouched — only the JS bundle gets minified.
- [ ] Leave `scripts/build/build-viewer-browser-host.mjs` and its `--check` byte-stability contract for `clients/viewer/browser-host.js` unchanged.
- [ ] Confirm the existing viewer test suite (`npm test` / relevant `tests/viewer.*.test.ts`) passes running against the minified `viewer_assets` copy.
- [ ] Measure and note the before/after size of the served `browser-host.js` in the task's Report.
- [ ] Use `python3 -m logics_manager flow progress task task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
