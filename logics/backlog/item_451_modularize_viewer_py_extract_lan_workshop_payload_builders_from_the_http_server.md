## item_451_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server - Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server)
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
`logics_manager/viewer.py` has grown to ~5,153 lines and bundles several independent concerns into a single module, making it hard to read, test, and evolve.
Biggest smell: `LogicsViewerRequestHandler` (~1,286 lines) and the HTTP server live alongside session registries, a LAN pairing broker, and payload builders that are not tightly coupled to one another.
Goal: extract the autonomous concerns into dedicated modules with no behavior change, shrinking the server file and clarifying internal boundaries.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `viewer_lan.py` and `viewer_workshop.py` are extracted; `viewer.py` retains only the HTTP server + request handler (plus payloads if AC3 is included).
- AC2: No observable behavior change (routes, payloads, LAN pairing, workshop sessions); `pytest tests/python/` and the vitest suite pass without changes to integration tests.
- AC3: (optional/second slice) payload builders extracted into `viewer_payloads.py`.
- AC4: Imports stay backward compatible (re-export from `viewer.py` if external code imports these symbols).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `viewer_lan.py` and `viewer_workshop.py` are extracted; `viewer.py` retains only the HTTP server + request handler (plus payloads if AC3 is included).
- request-AC2 -> This backlog slice. Proof: AC2: No observable behavior change (routes, payloads, LAN pairing, workshop sessions); `pytest tests/python/` and the vitest suite pass without changes to integration tests.
- request-AC3 -> This backlog slice. Proof: AC3: (optional/second slice) payload builders extracted into `viewer_payloads.py`.
- request-AC4 -> This backlog slice. Proof: AC4: Imports stay backward compatible (re-export from `viewer.py` if external code imports these symbols).

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
- Request: `req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- Primary task(s): `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`

# AI Context
- Summary: Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server)
- Keywords: backlog-groom, request, modularize viewer.py (extract lan, workshop, payload builders from the http server), bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server).
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server.md`.
- Generated locally by logics-manager.
- Task `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
