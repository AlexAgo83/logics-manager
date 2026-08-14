## task_358_give_viewer_static_assets_and_api_items_cache_friendly_conditional_responses - Give viewer static assets and /api/items cache-friendly, conditional responses
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:58:40

# AI Context
- Summary: Add an ETag + conditional-response path to `_serve_file` and the /api/items handler in `logics_manager/viewer.py`, mirroring the pattern `_send_status_json` already uses, plus gzip compression for text responses above a size threshold.
- Keywords: ETag, Cache-Control, 304 revalidation, gzip, If-None-Match, Accept-Encoding
- Use when: Implementing item_786's scope.
- Skip when: Anything about bundle minification — that's task_359.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_786_performance_review_viewer_server_static_delivery_and_payload_transfer`

# Acceptance criteria
- AC1: A request for an unchanged static asset (`/browser-host.js`, `/viewer.css`, `/vendor/mermaid.min.js`) sent with a valid `If-None-Match` gets a 304 with an empty body instead of the full file.
- AC2: A poll of /api/items sent with a valid `If-None-Match`, when the server-side payload cache has not been invalidated, gets a 304 with an empty body instead of the full JSON payload.
- AC3: Responses to `.js`/`.css` static assets and the /api/items JSON body are gzip-compressed when the client sends `Accept-Encoding: gzip`, with a test asserting the `Content-Encoding` header and a smaller body than the uncompressed original.

# Plan
- [ ] Add a helper computing an ETag from bytes (e.g. `hashlib.sha256(content).hexdigest()[:16]`) or from file mtime+size for static files.
- [ ] Update `_serve_file` (`logics_manager/viewer.py`) to compute the ETag, compare against the request's `If-None-Match` header, and answer 304 with no body on a match; otherwise pass `etag=` into `_send_bytes` as `_send_status_json` already does.
- [ ] Update the /api/items handler to derive its ETag from the already-cached payload (computed once when the cache refreshes, not per request) and serve through the same conditional path.
- [ ] Add gzip compression (stdlib `gzip.compress`) for `.js`/`.css` static responses and the /api/items JSON body, gated on `Accept-Encoding: gzip` in the request and a minimum size threshold; set `Content-Encoding: gzip` and adjust `Content-Length`.
- [ ] Add or extend tests covering: 304 on matching `If-None-Match` for a static asset, 304 on an unchanged /api/items poll, and gzip applied only when `Accept-Encoding` allows it.
- [ ] Use `python3 -m logics_manager flow progress task task_358_give_viewer_static_assets_and_api_items_cache_friendly_conditional_responses.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_358_give_viewer_static_assets_and_api_items_cache_friendly_conditional_responses.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
