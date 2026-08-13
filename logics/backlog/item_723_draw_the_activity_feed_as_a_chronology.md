## item_723_draw_the_activity_feed_as_a_chronology - Draw the activity feed as a chronology
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Replace the stack of full-width boxes with a continuous spine, a marker per day, a named kind per row, a per-row time, and a visible marker for periods with no activity.
- Keywords: activity spine, day markers, event kind chip, per-row time, quiet period, slug repetition
- Use when: Changing how activity events are laid out, ordered, or labelled.
- Skip when: Which events are recorded, and the activity filters.

# Problem
- Events are a stack of full-width boxes carrying two short lines each, with the kind encoded in an undecoded letter badge and one group header timing the batch rather than the work, so order has to be reconstructed card by card.

# Scope
- In:
  - A continuous spine with a marker per day and a per-event marker whose colour agrees with a named kind on the row.
  - A per-row time, using the width the rows already occupy.
  - Render a period without activity as such.
  - Stop repeating the document's title as a slug on the same row.
- Out:
  - Which events are recorded, and the activity filters.

# Acceptance criteria
- AC11: The feed reads as a chronology, with kind legible from the row itself.
- AC13: A quiet period is visible rather than inferred.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: The feed reads as a chronology, with kind legible from the row itself.
- request-AC13 -> This backlog slice. Proof: AC13: A quiet period is visible rather than inferred.

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
