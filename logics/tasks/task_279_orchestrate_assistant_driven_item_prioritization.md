## task_279_orchestrate_assistant_driven_item_prioritization - Orchestrate assistant-driven item prioritization
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Land the parser, status sort, and status-line display first so priority has an observable effect once items carry it.
- [ ] 2. Update authoring and scaffold templates to emit a populated default priority.
- [ ] 3. Add the viewer card badge once the parsed priority is available in the payload.
- [ ] 4. Wire priority into the generated instructions and backlog-groom guidance so the assistant sets it deliberately and plans by it.
- [ ] 5. Add the parse + sort and instruction-guidance checks and confirm lint and audit pass on corpus and code.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_509_parse_item_priority_and_order_status_output_by_it`
- `item_510_populate_item_priority_on_authoring_and_scaffolding`
- `item_511_show_item_priority_as_a_viewer_card_badge`
- `item_512_teach_the_assistant_to_set_and_plan_by_priority`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC3 -> This task. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC5 -> This task. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC7 -> This task. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Finish workflow executed on 2026-06-26.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-26.
- Linked backlog item(s): `item_509_parse_item_priority_and_order_status_output_by_it`, `item_510_populate_item_priority_on_authoring_and_scaffolding`, `item_511_show_item_priority_as_a_viewer_card_badge`, `item_512_teach_the_assistant_to_set_and_plan_by_priority`
- Related request(s): `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`

# AI Context
- Summary: Orchestrate assistant-driven item prioritization
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
- Product brief(s): `prod_031_assistant_driven_work_prioritization`
- Architecture decision(s): (none yet)
