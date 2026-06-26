## item_511_show_item_priority_as_a_viewer_card_badge - Show item priority as a viewer card badge
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Workflow prioritization
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer renders status/progress/complexity badges on each card but has no way to surface an item's priority once it is parsed, so the prioritization is invisible in cdx view.

# Scope
- In:
  - Include the parsed item priority in the viewer card payload (viewer.py)
  - Render it as a read-only badge in browser-host.js consistent with the existing status/progress/complexity badges
  - Cover the badge with the existing viewer smoke/render test approach
- Out:
  - Editing priority from the viewer (read-only display only)
  - The parser, status sort, and authoring templates (sibling slices)

# Acceptance criteria
- AC6: Each backlog card in cdx view shows its priority as a read-only badge matching the existing badge styling, and the viewer payload carries the priority value.
- AC7: Cards without a parsed priority fall back to the documented default tier without breaking the layout.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Each backlog card in cdx view shows its priority as a read-only badge matching the existing badge styling, and the viewer payload carries the priority value.
- request-AC1 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC2 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC3 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC4 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC5 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
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
- Summary: Show item priority as a viewer card badge
- Keywords: scaffolded-backlog, show item priority as a viewer card badge, implementation-ready
- Use when: Implementing the scaffolded slice for Show item priority as a viewer card badge.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Task `task_279_orchestrate_assistant_driven_item_prioritization` was finished via `logics-manager flow finish task` on 2026-06-26.
