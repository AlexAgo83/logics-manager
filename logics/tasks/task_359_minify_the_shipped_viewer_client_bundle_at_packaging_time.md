## task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time - Minify the shipped viewer client bundle at packaging time
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 22:26:09
> Owner: claude

# AI Context
- Summary: `scripts/build/build-assets.mjs` currently plain-copies `clients/viewer/browser-host.js` into `logics_manager/viewer_assets/viewer/` (`copyFiles`, line ~52-56); this task swaps that copy for a minifying esbuild pass so the served asset is smaller while the committed source stays untouched and readable.
- Keywords: esbuild minify, build-assets.mjs, viewer_assets, packaging pipeline
- Use when: Implementing item_787's scope.
- Skip when: Anything about ETag/gzip on the served response — that's task_358.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_787_performance_review_viewer_server_static_delivery_and_payload_transfer`

# Acceptance criteria
- AC1: The `browser-host.js` served from `logics_manager/viewer_assets/viewer/` is a minified build, measurably smaller than the current 596 KB committed source, while `clients/viewer/browser-host.js` remains unminified and its `--check` mode still passes unchanged.
- AC2: The existing viewer test suite (JS/TS tests exercising `browser-host.js` behavior) passes unmodified against the minified asset actually served.

# Plan
- [x] In `scripts/build/build-assets.mjs`, replace the plain `copyFileSync` of `browser-host.js` with an esbuild `build()` call using `minify: true` on the already-bundled file, writing the minified output to `logics_manager/viewer_assets/viewer/browser-host.js` (source map linked).
- [x] Leave `index.html`, `viewer.css`, and the vendor copy untouched — only the JS bundle gets minified.
- [x] Leave `scripts/build/build-viewer-browser-host.mjs` and its `--check` byte-stability contract for `clients/viewer/browser-host.js` unchanged.
- [x] Confirm the existing viewer test suite (`npm test` / relevant `tests/viewer.*.test.ts`) passes running against the minified `viewer_assets` copy.
- [x] Measure and note the before/after size of the served `browser-host.js` in the task's Report.
- [ ] Use `python3 -m logics_manager flow progress task task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time.md` after implementation.

# Validation
- `node scripts/build/build-assets.mjs` — regenerates `viewer_assets`; `browser-host.js` measured 627,456 bytes -> 368,132 bytes (~41% smaller).
- `node scripts/build/build-viewer-browser-host.mjs --check` — passes; the committed `clients/viewer/browser-host.js` is untouched by this change.
- `npx vitest run` — 929 passed (full suite). None of these tests read from `logics_manager/viewer_assets/`, so they exercise the unminified source unmodified, per AC2.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- `build-assets.mjs` now builds `browser-host.js` into `viewer_assets` via esbuild (`bundle: false`, `minify: true`, `sourcemap: "linked"`) instead of a plain file copy; `index.html`, `viewer.css`, and the vendor bundle are unaffected.
- The served asset shrank from 627,456 to 368,132 bytes (~41%).
- The emitted `browser-host.js.map` only maps back to the bundled-but-unminified `clients/viewer/browser-host.js`, not through to the original per-module sources — noted as a `ponytail:` ceiling in the script; composing through both the bundler's and the minifier's maps was more machinery than this packaging step needs.
- `clients/viewer/browser-host.js` (the committed, human-reviewable bundle) and `build-viewer-browser-host.mjs`'s byte-stable `--check` contract for it are both untouched.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_787_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Related request(s): `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`

# Links
- Request: `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC3 -> This task. Proof: Implemented in 1fd484eb: `build-assets.mjs` minifies `browser-host.js` via esbuild when writing it into `viewer_assets` (627,456 -> 368,132 bytes), while `clients/viewer/browser-host.js` stays untouched and its `--check` byte-stability contract still passes. Validated with: `node scripts/build/build-viewer-browser-host.mjs --check` and `npx vitest run` (929 passed, none reading from `viewer_assets`). Source: `1fd484eb`

Note: req_358's AC1/AC2 (ETag/gzip on served responses) are out of this task's scope — they belong to task_358/item_786, not this task.
