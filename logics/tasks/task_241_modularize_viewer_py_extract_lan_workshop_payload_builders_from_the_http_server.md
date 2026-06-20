## task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server - Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server)
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_451_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`

# Acceptance criteria
- AC1: `viewer_lan.py` and `viewer_workshop.py` are extracted; `viewer.py` retains only the HTTP server + request handler (plus payloads if AC3 is included).
- AC2: No observable behavior change (routes, payloads, LAN pairing, workshop sessions); `pytest tests/python/` and the vitest suite pass without changes to integration tests.
- AC3: (optional/second slice) payload builders extracted into `viewer_payloads.py`.
- AC4: Imports stay backward compatible (re-export from `viewer.py` if external code imports these symbols).

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement modularize viewer.py (extract lan, workshop, payload builders from the http server).
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
