## task_358_give_viewer_static_assets_and_api_items_cache_friendly_conditional_responses - Give viewer static assets and /api/items cache-friendly, conditional responses
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
- Summary: Add an ETag + conditional-response path to `_serve_file` and the /api/items handler in `logics_manager/viewer.py`, mirroring the pattern `_send_status_json` already uses, plus gzip compression for text responses above a size threshold.
- Keywords: ETag, Cache-Control, 304 revalidation, gzip, If-None-Match, Accept-Encoding
- Use when: Implementing item_786's scope.
- Skip when: Anything about bundle minification — that's task_359.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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
- `python3 -m pytest tests/python/test_viewer_cli.py -q` — 169 passed.
- `python3 -m pytest tests/python/ -q` — 1369 passed (full suite, no regressions).
- `python3 -m ruff check logics_manager/viewer.py logics_manager/update_check.py tests/python/test_viewer_cli.py` — clean (one pre-existing, unrelated F811 in test_viewer_cli.py confirmed present before this change via `git stash`).
- Manual smoke test against the running dev viewer: `curl -D - /api/items` returns an `ETag`; a repeat request with `If-None-Match` returns 304; `curl -H "Accept-Encoding: gzip" /viewer.css` returns `Content-Encoding: gzip`.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- `_serve_file` now computes an ETag from mtime+size before touching the file, so an unchanged static asset (`browser-host.js`, `viewer.css`, `mermaid.min.js`) answers 304 with zero disk reads instead of always `Cache-Control: no-store`.
- `/api/items` now serves through a new `_send_json_cacheable` helper (hash-based ETag over the response body), reused by no other route yet.
- The 304/`If-None-Match` check was centralized into `_etag_fresh`/`_send_not_modified` and `_send_status_json` was simplified to call them, instead of duplicating the check a third time.
- Root cause found and fixed along the way: `UpdateInfo.checked_at` (`logics_manager/update_check.py`) was stamped with the current call's wall clock even on a cache hit, so `/api/items`'s embedded `updateInfo` never repeated byte-for-byte across two polls — which would have made its ETag never validate in practice. Fixed to report the cached check's own timestamp on a cache hit.
- gzip added for `.css`/`.html`/`.js`/`.json`/`.map`/`.svg` responses above 512 bytes when the client sends `Accept-Encoding: gzip`.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_786_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Related request(s): `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`

# Links
- Request: `req_358_performance_review_viewer_server_static_delivery_and_payload_transfer`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in e16ac48a: `_serve_file` computes an ETag from mtime+size and answers 304 with no disk read on a match; text assets (`.js`/`.css`/`.html`/`.json`/`.map`/`.svg`) are gzip-compressed when `Accept-Encoding` allows it. Validated with: `python3 -m pytest tests/python/test_viewer_cli.py -q` (169 passed) and manually against the running dev viewer (curl: `/viewer.css` revalidates to 304 with `If-None-Match`, and returns `Content-Encoding: gzip` with `Accept-Encoding: gzip`). Source: `e16ac48a`
- request-AC2 -> This task. Proof: Implemented in e16ac48a: `/api/items` now serves through `_send_json_cacheable`, hashing the body for an ETag and gzip-compressing it when accepted; root-caused `UpdateInfo.checked_at` to stop varying every call so the payload actually repeats byte-for-byte between unchanged polls. Validated with: `python3 -m pytest tests/python/test_viewer_cli.py -q` (169 passed) and manually (curl: `/api/items` ETag + 304 on revalidation). Source: `e16ac48a`

Note: req_358's own AC3 (bundle minification) is out of this task's scope — it belongs to task_359/item_787, not this task. This task's own local AC3 (gzip) is covered in the proofs above.
