## item_722_give_a_document_a_lifeline_in_the_details_panel - Give a document a lifeline in the details panel
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Show the beats a document has reached, the one it is on, and when each was reached, within what item_716 established is honestly available -- degrading legibly rather than inventing a date.
- Keywords: document lifeline, lifecycle beats, provenance, indicators reviewed, degraded rendering
- Use when: Adding or changing the lifeline in the details panel.
- Skip when: Recording new lifecycle events, unless the feasibility check shows the lifeline is otherwise not renderable.

# Problem
- The panel reports the current status and the last update, so answering "where is this document in its life" means reading the document.

# Scope
- In:
  - Show the beats a document has reached, the beat it is on, and when each was reached, within what the preceding investigation established is honestly available.
  - Degrade legibly when a beat has no recorded date rather than inventing one.
- Out:
  - Recording new lifecycle events, unless the investigation shows the lifeline is otherwise not renderable.

# Acceptance criteria
- AC9: The lifeline shows reached beats, the current beat, and the date of each, degrading legibly where a date is absent.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: The lifeline shows reached beats, the current beat, and the date of each, degrading legibly where a date is absent.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
