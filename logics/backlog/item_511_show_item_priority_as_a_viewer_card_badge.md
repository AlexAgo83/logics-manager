## item_511_show_item_priority_as_a_viewer_card_badge - Show item priority as a viewer card badge
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
