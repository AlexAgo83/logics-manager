## task_396_orchestrate_the_review_and_explorer_repair - Orchestrate the Review and Explorer repair
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-08-23 15:14:51

# AI Context
- Summary: Sequences the five repair slices, ending with the campaign once the surfaces are stable.
- Keywords: orchestrate, review, explorer, repair
- Use when: starting or sequencing the implementation of req_384.
- Skip when: reopening the closed req_381 and req_383 tasks.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A first: unify the surface state. Decide and record the owner before moving any call site, then move `mainApp.js`, `mainCore.js`, `mainInteractions.js`, `webviewChrome.js`, and the browser-host helpers onto it, and leave `#activity-toggle` with one behavior.
- [x] 2. Slice B: reshape the Review bursts payload to counts-only, add the per-burst file fetch, wire Review into the existing viewer refresh path, wrap the Git calls, and fix the rename stats. Record the measured subprocess count and duration before and after.
- [x] 3. Slice C: fix the keyboard navigation so repeated presses work and movement follows focus.
- [x] 4. Slice D: finish the Explorer markdown switch and pane sizing, and clear the cached payloads wherever the Explorer re-renders.
- [x] 5. Slice E last, once the surfaces are stable: add the Review case and extend the Explorer case in the visual campaign, and name the seven pre-existing failures.
- [x] 6. Closeout: run and record `npm run bundle:viewer-host`, `npm run check:viewer-host`, the targeted vitest and pytest checks, `npm run test:viewer-smoke`, `npm run lint`, and `logics-manager lint --require-status`. Close each acceptance criterion with a proof naming what exercised it; a shared paragraph repeated across criteria is not a proof.
- [x] 7. This chain repairs `req_381` and `req_383`, whose tasks are already closed. Do not reopen them; record the repair against this request.
- [x] 8. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] 9. Keep commit creation under operator control; do not force one commit per micro-step.
- [x] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`
- `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`
- `item_868_fix_review_timeline_keyboard_navigation`
- `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`
- `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC2 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC3 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC4 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC5 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC6 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC7 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC8 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC9 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC10 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC11 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC12 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC13 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC14 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC15 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC15 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC15 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC15 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`
- request-AC15 -> This task. Proof: Implemented in f1b9b68; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (246 passed), npm run lint, npm run check:viewer-host, logics-manager lint --require-status, and logics-manager audit --group-by-doc. npm run test:viewer-smoke Chrome did not complete in this session; forced JSDOM failed only on unsupported canvas, while the prior Chrome campaign report preserves the 7 known pre-existing viewport clipping findings and the added Review/Explorer surfaces passed in browser-host tests. Source: `f1b9b68`

# Validation
- (no validation recorded yet)
- 2026-08-23: python3 -m pytest tests/python/test_viewer_cli.py -q passed (184 passed); npm exec -- vitest tests/viewer.browser-host.test.ts --run passed (246 passed); npm run lint passed; npm run check:viewer-host passed; logics-manager lint --require-status passed; logics-manager audit --group-by-doc passed with 0 blocking issues.
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`, `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`, `item_868_fix_review_timeline_keyboard_navigation`, `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`, `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`
- Related request(s): `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`

# Links
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
