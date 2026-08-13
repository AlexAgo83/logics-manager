## item_717_split_the_board_into_a_flow_queue_and_a_companion_library - Split the board into a flow queue and a companion library
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 30%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Render request/backlog/task as the board's columns and the 118 all-settled companion docs as a searchable collapsible index, using the split `logicsModel.js` already defines.
- Keywords: isPrimaryFlowStage, isCompanionStage, board columns, companion index, clipped column, renderBoardApp
- Use when: Changing which stages are columns, or how companion, spec and runbook docs are reached from the board.
- Skip when: Changing which stages exist or how documents are classified into them.

# Problem
- Seven stages render as equal peer columns, so the sixth is clipped mid-word at 1440 and a third of the board goes to 118 companion documents that are all Settled and cannot be triaged.

# Scope
- In:
  - Render the primary flow as the board's columns, using the distinction `logicsModel.js` already draws.
  - Present the companion stages, specs and runbooks as one searchable grouped index on the same screen, collapsible.
  - Confirm no heading is clipped at the three viewports.
- Out:
  - Changing which stages exist, and how documents are classified into them.

# Acceptance criteria
- AC1: Flow stages are columns, companions are a searchable collapsible index, and nothing is clipped at 1440x900.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Flow stages are columns, companions are a searchable collapsible index, and nothing is clipped at 1440x900.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
