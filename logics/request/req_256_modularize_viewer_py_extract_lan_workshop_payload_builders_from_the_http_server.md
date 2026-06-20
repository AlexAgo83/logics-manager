## req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server - Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server)
> From version: 2.11.6
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- `logics_manager/viewer.py` has grown to ~5,153 lines and bundles several independent concerns into a single module, making it hard to read, test, and evolve.
- Biggest smell: `LogicsViewerRequestHandler` (~1,286 lines) and the HTTP server live alongside session registries, a LAN pairing broker, and payload builders that are not tightly coupled to one another.
- Goal: extract the autonomous concerns into dedicated modules with no behavior change, shrinking the server file and clarifying internal boundaries.

# Context
- Target split (ordered by increasing risk):
  - `viewer_lan.py` (~180 lines): `_PairedDevice`, `LanDeviceRegistry`, `_PendingPairing`, `LanPairingBroker` — most self-contained concern, extract first.
  - `viewer_workshop.py` (~440 lines): `WorkshopCommandSession`, `WorkshopSessionRegistry`, `WorkshopTerminalSession`, `WorkshopTerminalRegistry`.
  - `viewer_payloads.py` (~600+ lines): `cdx_*` builders (13 functions, incl. `cdx_status_payload`/`_enrich_cdx_resume_status`), `git_*`, `ci_*`, `viewer_*`.
  - `viewer.py` (remainder, ~1,400 lines): `LogicsViewerServer` + `LogicsViewerRequestHandler`.
- Behavior-preserving refactor: no public API or HTTP route changes; moves and imports only.
- Related to recent work on `cdx_status_payload`/`_enrich_cdx_resume_status` (Missions unread badge, commit f8ad8fd).

# Acceptance criteria
- AC1: `viewer_lan.py` and `viewer_workshop.py` are extracted; `viewer.py` retains only the HTTP server + request handler (plus payloads if AC3 is included).
- AC2: No observable behavior change (routes, payloads, LAN pairing, workshop sessions); `pytest tests/python/` and the vitest suite pass without changes to integration tests.
- AC3: (optional/second slice) payload builders extracted into `viewer_payloads.py`.
- AC4: Imports stay backward compatible (re-export from `viewer.py` if external code imports these symbols).

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py` (primary target, ~5,153 lines)
- `tests/python/test_logics_manager_cli.py` (payload/handler coverage)
- `tests/viewer.browser-host.test.ts` (front-end contract consumed via the routes)

# AI Context
- Summary: Modularize viewer.py by extracting autonomous concerns (LAN pairing, Workshop session registries, payload builders) out of the HTTP server, with no behavior change.
- Keywords: refactor, viewer.py, modularization, HTTP handler, workshop sessions, LAN pairing, payload builders
- Use when: Reducing viewer.py size and clarifying its internal boundaries.
- Skip when: An HTTP-server refactor is already in progress or would conflict.

# Backlog
- `item_451_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
