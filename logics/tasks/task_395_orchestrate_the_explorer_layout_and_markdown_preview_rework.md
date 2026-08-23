## task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework - Orchestrate the Explorer layout and markdown preview rework
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 14:05:36
> Owner: codex

# AI Context
- Summary: Sequences the Explorer layout fix and the markdown switch, then the bundle rebuild and viewer checks.
- Keywords: orchestrate, explorer, layout, markdown, preview, rework
- Use when: starting or sequencing the implementation of req_383.
- Skip when: grooming unrelated Workshop or workspace-payload work.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A: split the Explorer render path so a file selection touches only the detail region, drop the redundant directory refetch, and move selection to a class and `aria-current` change on the existing rows.
- [x] 2. Slice A: move the scroll containers from the Explorer panel onto the two panes, flatten the list chrome to one anchored list, and derive the pane height from the Workshop panel rather than the viewport.
- [x] 3. Slice A: reset the detail scroll on file change without moving focus, announce the change through the existing live region, and keep directory navigation re-rendering the list.
- [x] 4. Slice A: handle the phone breakpoint with one scroll axis and a collapsible list, then cover the behavior in browser-host tests and the local viewer visual smoke run.
- [x] 5. Slice B: add the Raw/Preview control to the sticky detail header for markdown files, rendering through the existing markdown API with the code viewer as the fallback.
- [x] 6. Slice B: apply the 100 KB size default, persist an explicit choice through the existing viewer preferences, and keep the control absent for every non-markdown state.
- [x] 7. Closeout: regenerate the browser host bundle, then run the targeted vitest checks, `npm run test:viewer-smoke`, `npm run check:viewer-host`, and `logics-manager lint --require-status`.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] Sequencing: `task_393` edits the same four files (`browser-host/index.js`, `render.js`, `viewer.css`, and the generated `clients/viewer/browser-host.js`). It runs first, before `task_393` starts. Never run them in parallel; the generated bundle conflicts on every concurrent rebuild.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`
- `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC2 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC3 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC4 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC5 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC6 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC10 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC11 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC12 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC7 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC8 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC9 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC11 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`
- request-AC12 -> This task. Proof: Implemented in commits 12ff3e7a and 4f12a8b9: Explorer keeps an anchored tree with file-only detail refresh, independent scroll panes, aria-current/non-colour selection cue, detail scroll reset, Markdown Preview/Raw switch with persisted override and large-file Raw default, plus browser tests. Validated with python3 -m pytest tests/python/test_viewer_cli.py -q (183 passed), npm test (979 passed), npm run check:viewer-host, npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `4f12a8b9`

# Validation
- (no validation recorded yet)
- command: `python3 -m pytest tests/python/test_viewer_cli.py -q && npm test && npm run check:viewer-host && npm run lint && logics-manager lint --require-status && logics-manager audit --group-by-doc` | result: passed | date: 2026-08-23
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail`, `item_864_add_a_markdown_raw_and_preview_switch_to_the_explorer_detail_header`
- Related request(s): `req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane`

# Links
- Request: `req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane`
- Product brief(s): `prod_112_an_anchored_explorer_with_a_readable_detail_pane`
- Architecture decision(s): (none yet)
