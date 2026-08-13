## item_721_lead_the_details_panel_with_what_the_document_says - Lead the details panel with what the document says
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: High
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The panel shows a title, a path, the same slug twice and seven collapsed headings, while the payload it already receives carries summaryPoints, acceptanceCriteria, references and usedBy; invert what is expanded.
- Keywords: details panel, summaryPoints, acceptanceCriteria, references, usedBy, collapsed sections, panel overlap, dead space
- Use when: Changing what the details panel shows, what it expands on open, or how it sits beside the board.
- Skip when: The document reader and editor the panel's actions open.

# Problem
- The panel's whole content is a title, a status, a timestamp, a path, the same slug again, and seven collapsed headings -- while the payload it already receives carries the summary, the acceptance criteria and the links it does not show.

# Scope
- In:
  - Expand the substance on open: summary, acceptance criteria as a checklist with a count, links drawn as parent and children.
  - Fold what is machine-facing: indicators, context pack, raw references.
  - Identify the document once, make room on the board rather than overlapping a column, and remove the dead space above the actions.
- Out:
  - The document reader and editor the panel's actions open.

# Acceptance criteria
- AC8: Substance is expanded on open; machine-facing sections are what fold.
- AC10: The document is identified once, the panel makes room rather than overlapping, and no dead space remains.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: Substance is expanded on open; machine-facing sections are what fold.
- request-AC10 -> This backlog slice. Proof: AC10: The document is identified once, the panel makes room rather than overlapping, and no dead space remains.

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
