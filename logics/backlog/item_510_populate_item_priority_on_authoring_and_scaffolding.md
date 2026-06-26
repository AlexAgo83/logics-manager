## item_510_populate_item_priority_on_authoring_and_scaffolding - Populate item priority on authoring and scaffolding
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Workflow prioritization
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- assist_support.py and flow templates emit an empty Impact:/Urgency: block, so newly authored items have no priority for the parser to read.

# Scope
- In:
  - Emit a populated priority tier (default) in the `# Priority` block from assist authoring and from flow scaffold/new item templates
  - Document the priority field and its tiers where item authoring is described
  - Add a runnable check over parse + sort behavior
- Out:
  - The parser and sort logic itself (sibling slice)
  - Backfilling priority on existing items beyond defaults

# Acceptance criteria
- AC4: Items created via assist and via flow scaffold/new include a populated priority tier with no empty Impact:/Urgency: placeholder, and no new dependency is added.
- AC5: A runnable check exercises parse + sort, and lint and audit pass on the resulting corpus and code.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Items created via assist and via flow scaffold/new include a populated priority tier with no empty Impact:/Urgency: placeholder, and no new dependency is added.
- request-AC5 -> This backlog slice. Proof: AC5: A runnable check exercises parse + sort, and lint and audit pass on the resulting corpus and code.
- request-AC1 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC2 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC3 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC6 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC7 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC8 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_assistant_driven_work_prioritization`
- Architecture decision(s): (none yet)
- Request: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
- Primary task(s): `task_279_orchestrate_assistant_driven_item_prioritization`

# AI Context
- Summary: Populate item priority on authoring and scaffolding
- Keywords: scaffolded-backlog, populate item priority on authoring and scaffolding, implementation-ready
- Use when: Implementing the scaffolded slice for Populate item priority on authoring and scaffolding.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Task `task_279_orchestrate_assistant_driven_item_prioritization` was finished via `logics-manager flow finish task` on 2026-06-26.
