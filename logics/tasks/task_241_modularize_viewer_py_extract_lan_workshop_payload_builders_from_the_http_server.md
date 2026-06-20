## task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server - Modularize viewer.py (extract LAN, Workshop, payload builders from the HTTP server)
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

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
- Implementation extracted LAN pairing/runtime into logics_manager/viewer_lan.py and Workshop command/terminal runtime into logics_manager/viewer_workshop.py; viewer.py re-imports/re-exports moved symbols for backward compatibility. Validation passed: python3 -m py_compile logics_manager/viewer.py logics_manager/viewer_lan.py logics_manager/viewer_workshop.py; python3 -m pytest tests/python/ -q (357 passed); npm test -- --run (57 files, 635 tests). AC3 payload extraction intentionally deferred as optional second slice.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_451_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- Related request(s): `req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`

# AI Context
- Summary: Implement modularize viewer.py (extract lan, workshop, payload builders from the http server).
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_256_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Evidence needed: `viewer_lan.py` and `viewer_workshop.py` are extracted; `viewer.py` retains only the HTTP server + request handler (plus payloads if AC3 is included).
- request-AC2 -> This task. Evidence needed: No observable behavior change (routes, payloads, LAN pairing, workshop sessions); `pytest tests/python/` and the vitest suite pass without changes to integration tests.
- request-AC3 -> This task. Evidence needed: (optional/second slice) payload builders extracted into `viewer_payloads.py`.
- request-AC4 -> This task. Evidence needed: Imports stay backward compatible (re-export from `viewer.py` if external code imports these symbols).
- request-AC1 -> This task. Proof: Implementation extracted LAN pairing/runtime into logics_manager/viewer_lan.py and Workshop command/terminal runtime into logics_manager/viewer_workshop.py; viewer.py imports/re-exports moved symbols for backward compatibility; py_compile, pytest tests/python (357 passed), and vitest (635 passed) passed; AC3 payload extraction deferred as optional second slice. Source: `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- request-AC2 -> This task. Proof: Implementation extracted LAN pairing/runtime into logics_manager/viewer_lan.py and Workshop command/terminal runtime into logics_manager/viewer_workshop.py; viewer.py imports/re-exports moved symbols for backward compatibility; py_compile, pytest tests/python (357 passed), and vitest (635 passed) passed; AC3 payload extraction deferred as optional second slice. Source: `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- request-AC3 -> This task. Proof: Implementation extracted LAN pairing/runtime into logics_manager/viewer_lan.py and Workshop command/terminal runtime into logics_manager/viewer_workshop.py; viewer.py imports/re-exports moved symbols for backward compatibility; py_compile, pytest tests/python (357 passed), and vitest (635 passed) passed; AC3 payload extraction deferred as optional second slice. Source: `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
- request-AC4 -> This task. Proof: Implementation extracted LAN pairing/runtime into logics_manager/viewer_lan.py and Workshop command/terminal runtime into logics_manager/viewer_workshop.py; viewer.py imports/re-exports moved symbols for backward compatibility; py_compile, pytest tests/python (357 passed), and vitest (635 passed) passed; AC3 payload extraction deferred as optional second slice. Source: `task_241_modularize_viewer_py_extract_lan_workshop_payload_builders_from_the_http_server`
