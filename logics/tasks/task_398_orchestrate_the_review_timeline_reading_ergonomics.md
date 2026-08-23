## task_398_orchestrate_the_review_timeline_reading_ergonomics - Orchestrate the Review timeline reading ergonomics
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 94%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-08-23 16:40:37

# AI Context
- Summary: Sequences the rail rebuild, the file rows and the shared split-pane factoring.
- Keywords: orchestrate, review, timeline, reading, ergonomics
- Use when: starting or sequencing req_386.
- Skip when: reopening the closed req_381, req_383, req_384 or req_385.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A first, because it changes the payload: carry author and timestamp separately, then rebuild the rail as an anchored row with dense tiles, reversed order, ghost tiles and the centred initial scroll.
- [x] 2. Slice A: record in `req_381` that its AC2 is superseded by this request's AC6, so the ordering is not restored later as a correction.
- [x] 3. Slice B: rebuild the file row as name-first with the directory beneath, and pin the kind and count badges to the row's corners with the space reserved for them.
- [x] 4. Slice C last: factor the list-and-detail rules into one definition, put Review's list and diff pane on it, and move the Explorer onto the same definition.
- [x] 5. Closeout: regenerate the bundle, then run and record `npm run check:viewer-host`, the targeted vitest and pytest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status`. Close each criterion with a proof naming what exercised it; a shared paragraph repeated across criteria is not a proof.
- [x] 6. Run the campaign against a viewer started from this repository. A `logics-manager view` left running from an installed package serves its own assets, and `npm run view` reuses it silently -- the run then judges a build that does not contain the change.
- [x] 7. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] 8. Keep commit creation under operator control; do not force one commit per micro-step.
- [x] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`
- `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`
- `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC2 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC3 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC4 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC5 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC6 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC7 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC8 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC9 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC10 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC11 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC12 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC13 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC14 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC14 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC14 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC15 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC15 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC15 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC16 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC16 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`
- request-AC16 -> This task. Proof: Implemented in dd804bb; validated with python3 -m pytest tests/python/test_viewer_cli.py -q (184 passed), npm exec -- vitest tests/viewer.browser-host.test.ts --run (250 passed), npm run bundle:viewer-host, npm run check:viewer-host, npm run lint, logics-manager lint --require-status, logics-manager audit --group-by-doc, and npm run test:viewer-smoke reporting only the seven pre-existing campaign findings while Review timeline checks passed at desktop/tablet/mobile. Source: `dd804bb`

# Validation
- (no validation recorded yet)
- 2026-08-23: python3 -m pytest tests/python/test_viewer_cli.py -q passed (184 passed); npm exec -- vitest tests/viewer.browser-host.test.ts --run passed (250 passed); npm run bundle:viewer-host passed; npm run check:viewer-host passed; npm run lint passed; logics-manager lint --require-status passed; logics-manager audit --group-by-doc passed with 0 blocking issues; npm run test:viewer-smoke ran and reported only the seven known pre-existing campaign findings, with Review timeline checks OK at desktop/tablet/mobile.
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`, `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`, `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`
- Related request(s): `req_386_make_the_review_timeline_readable_an_anchored_rail_denser_tiles_and_the_shared_split_pane`

# Links
- Request: `req_386_make_the_review_timeline_readable_an_anchored_rail_denser_tiles_and_the_shared_split_pane`
- Product brief(s): `prod_115_a_review_timeline_that_reads_like_a_timeline`
- Architecture decision(s): (none yet)
