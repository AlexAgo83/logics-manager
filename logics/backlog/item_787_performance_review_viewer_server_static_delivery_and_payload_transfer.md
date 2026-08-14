## item_787_performance_review_viewer_server_static_delivery_and_payload_transfer - Minify the shipped viewer client bundle at packaging time
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 22:21:55

# AI Context
- Summary: `scripts/build/build-viewer-browser-host.mjs` builds `clients/viewer/browser-host.js` with esbuild but no `minify` option, and its `--check` mode compares that output byte-for-byte against the committed file — deliberately readable for reviewable diffs. What actually reaches the browser (`logics_manager/viewer_assets/viewer/browser-host.js`) should be a minified copy produced at packaging time, not a change to the committed bundle itself.
- Keywords: esbuild minify, bundle size, packaging pipeline, viewer_assets, byte-stable committed artifact
- Use when: Touching the build/packaging step that copies `clients/viewer/browser-host.js` into `logics_manager/viewer_assets`, or the esbuild invocation in `build-viewer-browser-host.mjs`.
- Skip when: Anything about the committed, readable `clients/viewer/browser-host.js` itself — that file's byte-for-byte `--check` contract stays as-is.

# Problem
`build-viewer-browser-host.mjs`'s esbuild call has no `minify` option, so the 596 KB / 12365-line committed bundle carries full function names and formatting. That file is deliberately kept readable (its own `--check` mode enforces byte-stability against the committed copy for reviewable diffs), so minifying it directly would break that contract. The bundle actually served to browsers — the copy under `logics_manager/viewer_assets/viewer/browser-host.js` — has no reason to inherit that readability requirement.

# Scope
- In:
  - A minification pass (esbuild `minify: true`, or an equivalent lightweight step) applied wherever `clients/viewer/browser-host.js` is currently copied into `logics_manager/viewer_assets` (the `build:assets` step, per `scripts/build/build-assets.mjs`) or into any other packaged output, producing the minified bytes actually served.
  - Verifying the minified output is functionally equivalent (existing viewer test suite passes against the minified asset).
- Out:
  - Adding `minify` to the esbuild call in `build-viewer-browser-host.mjs` itself — that would break the file's byte-stable `--check` contract.
  - Minifying `mermaid.min.js` or other vendor bundles — those already ship pre-minified.

# Acceptance criteria
- AC1: The `browser-host.js` served from `logics_manager/viewer_assets/viewer/` is a minified build, measurably smaller than the current 596 KB committed source, while `clients/viewer/browser-host.js` remains unminified and its `--check` mode still passes unchanged.
- AC2: The existing viewer test suite (JS/TS tests exercising `browser-host.js` behavior) passes unmodified against the minified asset actually served.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: Implemented in 1fd484eb: `build-assets.mjs` minifies `browser-host.js` via esbuild when writing it into `viewer_assets` (627,456 -> 368,132 bytes), while the committed `clients/viewer/browser-host.js` and its `--check` byte-stability contract are unaffected. Validated with `node scripts/build/build-viewer-browser-host.mjs --check` and `npx vitest run` (929 passed). Source: `1fd484eb`

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_358_performance_review_viewer_server_static_delivery_and_payload_transfer.md`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Pure size win with no behavior change; lower priority than item_786's wire-traffic fix since the bundle is only fetched once per page load, not on a poll timer.

# Notes
- Derived from `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`, AC3 only. AC1 and AC2 of the request are scoped separately in item_786.
- Source file: `logics/request/req_358_performance_review_viewer_server_static_delivery_and_payload_transfer.md`.
- Task `task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time` was finished via `logics-manager flow finish task` on 2026-08-14.

# Tasks
- `task_359_minify_the_shipped_viewer_client_bundle_at_packaging_time`
