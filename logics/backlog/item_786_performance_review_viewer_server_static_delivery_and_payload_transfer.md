## item_786_performance_review_viewer_server_static_delivery_and_payload_transfer - Give viewer static assets and /api/items cache-friendly, conditional responses
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:59:19

# AI Context
- Summary: `_serve_file` and the /api/items route both call `_send_bytes`/`_send_json` without an ETag, which forces `Cache-Control: no-store` on every response — so unchanging static assets (mermaid.min.js, browser-host.js, viewer.css) and unchanged `/api/items` polls are re-transferred in full every time, uncompressed, even though `_send_status_json` next to them already demonstrates the ETag + 304 pattern in this same file.
- Keywords: ETag, Cache-Control, 304 revalidation, gzip, static assets, /api/items polling
- Use when: Touching `_serve_file`, `_send_bytes`, `_handle_static_get`, or the /api/items route handler in `logics_manager/viewer.py`.
- Skip when: Payload construction cost or refresh cadence — req_356/item_781-783 already cover that; this is about bytes already built, going out over the wire.

# Problem
`_serve_file` (`logics_manager/viewer.py`) reads static files from disk and sends them via `_send_bytes` with no `etag` argument, so every response gets `Cache-Control: no-store` — including a 3.4 MB vendor bundle and a 596 KB compiled client bundle that never change at runtime. The /api/items route has the same gap: it calls `_send_json` directly, so a poll that hits the server-side payload cache (already fixed by req_356/item_781-783) still ships the full ~4.5 MB JSON body to every open tab every 15 seconds. Neither path compresses its response.

# Scope
- In:
  - `_serve_file` computing an ETag (content hash, or mtime+size) for the file it serves and passing it to `_send_bytes`, so unchanged static assets get `Cache-Control: no-cache` + 304 revalidation instead of `no-store`.
  - The /api/items handler serving through the same conditional-response path, with the ETag derived from the already-cached payload (computed once per cache refresh, not per request).
  - gzip compression (stdlib `gzip`, gated on the request's `Accept-Encoding`) for text responses above a size threshold (`.js`, `.css`, and the /api/items JSON body).
- Out:
  - Minifying the client bundle — separate slice (item_787).
  - Content-hashed filenames or a CDN-style cache-busting scheme; ETag/304 is sufficient for a local dev/LAN viewer.
  - Compressing small JSON responses (status endpoints) where the overhead isn't worth it.

# Acceptance criteria
- AC1: A request for an unchanged static asset (`/browser-host.js`, `/viewer.css`, `/vendor/mermaid.min.js`) sent with a valid `If-None-Match` gets a 304 with an empty body instead of the full file.
- AC2: A poll of /api/items sent with a valid `If-None-Match`, when the server-side payload cache has not been invalidated, gets a 304 with an empty body instead of the full JSON payload.
- AC3: Responses to `.js`/`.css` static assets and the /api/items JSON body are gzip-compressed when the client sends `Accept-Encoding: gzip`, with a test asserting the `Content-Encoding` header and a smaller body than the uncompressed original.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A request for an unchanged static asset (`/browser-host.js`, `/viewer.css`, `/vendor/mermaid.min.js`) sent with a valid `If-None-Match` gets a 304 with an empty body instead of the full file.
- request-AC2 -> This backlog slice. Proof: AC2: A poll of /api/items sent with a valid `If-None-Match`, when the server-side payload cache has not been invalidated, gets a 304 with an empty body instead of the full JSON payload.

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
- Priority: Medium
- Rationale: No user-visible bug, but the fix is small and directly reduces wire traffic on the viewer's highest-frequency paths (static bundle load, 15s /api/items poll).

# Notes
- Derived from `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`, AC1 and AC2. AC3 of the request (bundle minification) is scoped separately in item_787 since it's a build-pipeline change, not a runtime response change.
- Source file: `logics/request/req_358_performance_review_viewer_server_static_delivery_and_payload_transfer.md`.

# Tasks
- `task_358_give_viewer_static_assets_and_api_items_cache_friendly_conditional_responses`
