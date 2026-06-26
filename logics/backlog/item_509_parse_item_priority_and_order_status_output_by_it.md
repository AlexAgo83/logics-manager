## item_509_parse_item_priority_and_order_status_output_by_it - Parse item priority and order status output by it
> From version: 2.13.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Workflow prioritization
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- status_payload lists open work in collection order; the `# Priority` block on items is never parsed, so importance has no effect on the recommended next work.

# Scope
- In:
  - Define a single priority tier (enum with a documented default) read from the existing `# Priority` block
  - Parse it into LogicsDoc with the same line-prefix pattern used for status/progress
  - Sort each status_payload list by priority (highest first) with a stable tiebreak before [:limit]
  - Render the priority tier on each status output line (render_status)
  - Resolve a task's effective priority from its linked item for ordering purposes
- Out:
  - Authoring/template changes (handled by the sibling slice)
  - Viewer card badge (handled by the viewer slice)
  - Any Impact x Urgency scoring or dependency graph

# Acceptance criteria
- AC1: LogicsDoc exposes a parsed priority for backlog items, with a documented default when the field is absent.
- AC2: status orders each open-work list by priority with a stable tiebreak before truncating to the limit, and shows the priority tier on each rendered line.
- AC3: A task with no own priority is ordered by its linked item's priority.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: LogicsDoc exposes a parsed priority for backlog items, with a documented default when the field is absent.
- request-AC2 -> This backlog slice. Proof: AC2: status orders each open-work list by priority with a stable tiebreak before truncating to the limit, and shows the priority tier on each rendered line.
- request-AC3 -> This backlog slice. Proof: AC3: A task with no own priority is ordered by its linked item's priority.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_031_assistant_driven_work_prioritization`
- Architecture decision(s): (none yet)
- Request: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
- Primary task(s): `task_279_orchestrate_assistant_driven_item_prioritization`

# AI Context
- Summary: Parse item priority and order status output by it
- Keywords: scaffolded-backlog, parse item priority and order status output by it, implementation-ready
- Use when: Implementing the scaffolded slice for Parse item priority and order status output by it.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
