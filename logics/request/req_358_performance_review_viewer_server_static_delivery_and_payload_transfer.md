## req_358_performance_review_viewer_server_static_delivery_and_payload_transfer - Performance review: viewer server static delivery and payload transfer
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 22:26:09

# AI Context
- Summary: Three findings from a performance-focused read of `logics_manager/viewer.py` and the viewer's build pipeline: static assets are served with `Cache-Control: no-store` and no compression, the /api/items poll payload is re-transferred in full every 15s even on a cache hit, and the shipped client bundle is unminified. All three sit downstream of the payload-rebuild fix already shipped in req_356/item_781-783, which this review deliberately does not re-litigate.
- Keywords: viewer static assets, cache headers, gzip compression, browser-host bundle size, minification, poll payload transfer, ETag
- Use when: Changing how the viewer server serves static files or the /api/items poll response, or deciding what the client build pipeline should produce.
- Skip when: Payload *construction* cost or refresh cadence — req_356/item_781-783 already cover that; this is about bytes on the wire after the payload is built.

# Needs
- The viewer server should not tell the browser to never cache assets that never change at runtime (vendor bundle, compiled client JS, CSS).
- Repeat /api/items polls that hit the server-side payload cache should not still cost a full uncompressed multi-MB transfer to every open tab.
- The client bundle shipped to the browser should not carry unminified source when the build already runs esbuild.

# Context
- **Static assets are served `no-store`, uncompressed, on every request.** `_serve_file` (`logics_manager/viewer.py:2206-2222`) calls `self._send_bytes(absolute.read_bytes(), content_type=content_type)` with no `etag` argument. `_send_bytes` (`logics_manager/viewer.py:2021-2044`) only sets `Cache-Control: no-cache` + `ETag` when an `etag` kwarg is passed (the path status/JSON endpoints use, e.g. `_send_status_json` at line 2064); when it isn't, it falls to `Cache-Control: no-store`. Every static route (/ (index), /browser-host.js, /viewer.css, /vendor/mermaid.min.js, /media/*) goes through `_handle_static_get` (`logics_manager/viewer.py:2516-2545`) into that no-etag path. `logics_manager/viewer_assets/vendor/mermaid.min.js` is 3.4 MB and `logics_manager/viewer_assets/viewer/browser-host.js` is 596 KB; both are re-read from disk and re-sent in full, with an explicit do-not-cache header, on every page load. No route anywhere in `viewer.py` sends `Content-Encoding` (grepped for gzip/zlib/brotli/Content-Encoding: no matches) — nothing is compressed on the wire.
- **The /api/items poll still transfers the full body on a cache hit.** The route handler (`logics_manager/viewer.py:2707-2715`) calls `self._send_json(...)`, which (per the point above) always sends `Cache-Control: no-store` with no ETag. req_356/item_781-783 stopped the *server* from rebuilding an unchanged payload, but every client's 15-second poll (`auto_refresh_interval_seconds`) still receives the full ~4.5 MB JSON body over the wire even when nothing changed and every open tab runs its own timer independently. The status endpoints next to it (`_send_status_json`, line 2064) already demonstrate the fix shape in this same file: ETag + `Cache-Control: no-cache` so an unchanged poll answers 304.
- **The shipped client bundle is unminified.** `scripts/build/build-viewer-browser-host.mjs:14-23` calls esbuild's `build()` with `bundle: true` but no minify option (esbuild defaults to false). The output (`logics_manager/viewer_assets/viewer/browser-host.js`, 12365 lines / 596 KB) retains full function names, multi-line formatting, and readable structure — e.g. its first lines are `(() => { // clients/viewer/src/browser-host/util.js\n  function activeCdxInteractionMenu() {...`. The `--check` mode in the same script compares output byte-for-byte to the committed file, which reads as a deliberate choice for reviewable diffs of the built artifact, not an oversight — but it means the artifact actually served to browsers ships uncompressed source-sized bytes rather than a minified production build.
- Not investigated: server-side memory growth independent of the CPU/refresh-cadence issue req_356 already covers; on-demand screen endpoints (/api/lint, /api/audit, /api/health) are fetched on screen-open in the client, not on the 15s timer, so were not treated as hot paths here.

# Acceptance criteria
- AC1: A decision is recorded on whether `_serve_file` should send cache-friendly headers (long-lived `Cache-Control` plus ETag/Last-Modified, or content-hashed filenames) for assets that do not change at runtime, and whether responses should be gzip/deflate-compressed.
- AC2: A decision is recorded on whether /api/items (and any other high-frequency poll route) should support conditional responses (ETag / 304) so an unchanged poll does not re-transfer the full payload body.
- AC3: A decision is recorded on whether the production client bundle should be minified (via esbuild's `minify` option) separately from the byte-stable, reviewable committed artifact, and if so, at what stage of the build/package pipeline.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py`
- `scripts/build/build-viewer-browser-host.mjs`
- `logics_manager/viewer_assets/vendor/mermaid.min.js`
- `logics_manager/viewer_assets/viewer/browser-host.js`

# Backlog
- `item_786_performance_review_viewer_server_static_delivery_and_payload_transfer`
- `item_787_performance_review_viewer_server_static_delivery_and_payload_transfer`
