## item_512_teach_the_assistant_to_set_and_plan_by_priority - Teach the assistant to set and plan by priority
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
- The generated logics instructions and the backlog-groom assist guidance never mention priority, so the assistant emits the default tier everywhere and never sequences its plan by priority — leaving the sort a no-op.

# Scope
- In:
  - Update the generated instructions (bootstrap _build_claude_instructions) to tell the assistant to set a deliberate priority tier with a one-line rationale when grooming or creating an item
  - Update the same instructions to tell the assistant to sequence its delivery plan / roadmap by status priority order
  - Update the backlog-groom assist nudge/template (assist_support.py) so a justified priority is part of the proposal
  - Refresh the LOGICS.md bridge if the priority guidance belongs there too
- Out:
  - The parser, status sort, viewer badge, and authoring default (sibling slices)
  - Enforcing priority correctness in lint (guidance, not a hard gate)

# Acceptance criteria
- AC7: After bootstrap, the generated instructions and backlog-groom guidance instruct the assistant to choose a deliberate priority tier with a rationale rather than accept the default.
- AC8: The generated instructions instruct the assistant to order its plan/roadmap by status priority, and a runnable check asserts the priority guidance is present in the generated instructions.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: After bootstrap, the generated instructions and backlog-groom guidance instruct the assistant to choose a deliberate priority tier with a rationale rather than accept the default.
- request-AC8 -> This backlog slice. Proof: AC8: The generated instructions instruct the assistant to order its plan/roadmap by status priority, and a runnable check asserts the priority guidance is present in the generated instructions.
- request-AC1 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC2 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC3 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC4 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC5 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.
- request-AC6 -> This backlog slice. Proof: task_279 implemented priority parsing/defaults, status sorting by effective priority, task priority inheritance from linked backlog items, rendered status priority text, default priority emission in flow/assist/scaffold templates, viewer payload priority, backlog card priority badge, and generated assistant guidance. Validations passed: python -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_cli.py tests/python/test_doc_parsing.py; npm test -- --run tests/webview.board-renderer.test.ts; npm run check:webview-media; npm run check:webview-media-mirror; python -m logics_manager lint --require-status.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_assistant_driven_work_prioritization`
- Architecture decision(s): (none yet)
- Request: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
- Primary task(s): `task_279_orchestrate_assistant_driven_item_prioritization`

# AI Context
- Summary: Teach the assistant to set and plan by priority
- Keywords: scaffolded-backlog, teach the assistant to set and plan by priority, implementation-ready
- Use when: Implementing the scaffolded slice for Teach the assistant to set and plan by priority.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Task `task_279_orchestrate_assistant_driven_item_prioritization` was finished via `logics-manager flow finish task` on 2026-06-26.
