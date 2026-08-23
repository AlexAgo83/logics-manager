## task_393_orchestrate_the_review_slot_change_timeline - Orchestrate the Review slot change timeline
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 86%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 13:56:44
> Owner: codex

# AI Context
- Summary: Coordinates backend Review burst data, frontend Review slot delivery, focused tests, bundle rebuild, and Logics validation.
- Keywords: orchestrate, review, slot, change, timeline
- Use when: starting or sequencing the implementation work for `req_381`.
- Skip when: grooming unrelated viewer Git cockpit improvements outside the Review slot.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Start with the backend Review payload and committed-file diff endpoint, reusing `viewer_git.py` safety and truncation helpers.
- [x] 2. Add focused Python coverage for review burst construction and committed-file diff edge cases.
- [x] 3. Wire the `Review` slot into the existing viewer navigation and browser-host screen router.
- [x] 4. `item_865` first: replace the `#activity-toggle` pill slider with a segmented surface control and migrate the boolean surface state across its seventeen call sites, still shipping only Activity and Project, with the phone fallback using the existing compact menu/sheet behavior instead of wrapping controls.
- [x] 4b. Then add `Review` as that control's third choice.
- [x] 5. Build the burst rail, file list, diff pane, responsive layout, empty states, and arrow-key selection in the shared viewer source with the smallest CSS needed.
- [x] 6. Add browser-host tests for render states, selection, keyboard navigation, diff fetches, and key-handler scoping against modals, text inputs, and the existing document-level shortcuts.
- [x] 7. Add Review to the existing visual campaign or equivalent layout harness at desktop, tablet, and phone widths.
- [x] 8. Regenerate the browser host bundle, run targeted checks, then validate the Logics docs and close out.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] Sequencing: `task_395` edits the same four files (`browser-host/index.js`, `render.js`, `viewer.css`, and the generated `clients/viewer/browser-host.js`). It runs second: `task_395` ships first. Never run them in parallel; the generated bundle conflicts on every concurrent rebuild.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_857_expose_review_bursts_from_local_git`
- `item_865_migrate_the_viewer_surface_state_from_a_boolean_to_a_tri_state`
- `item_858_build_the_review_slot_timeline_ui`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC3 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC5 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC7 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC8 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC10 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC1 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC9 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC11 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC12 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC1 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC2 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC3 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC4 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC5 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC6 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC7 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC8 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC9 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC10 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC11 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC12 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`
- request-AC13 -> This task. Proof: Implemented in commits 1f8325d0, 962b2672, and 7ef3a6bb: read-only Review bursts endpoint, file-scoped commit diffs, tri-state Activity/Project/Review viewer control, Review timeline UI, keyboard navigation, and tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (977 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `7ef3a6bb`

# Validation
- (no validation recorded yet)
- command: `python3 -m pytest tests/python/test_viewer_cli.py -q && npm test && npm run check:viewer-host && npm run lint && logics-manager lint --require-status && logics-manager audit --group-by-doc` | result: passed | date: 2026-08-23
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_857_expose_review_bursts_from_local_git`, `item_858_build_the_review_slot_timeline_ui`, `item_865_migrate_the_viewer_surface_state_from_a_boolean_to_a_tri_state`
- Related request(s): `req_381_add_a_review_slot_for_project_change_timelines`

# Links
- Request: `req_381_add_a_review_slot_for_project_change_timelines`
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)
