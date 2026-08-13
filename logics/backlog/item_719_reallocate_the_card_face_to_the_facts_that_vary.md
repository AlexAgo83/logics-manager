## item_719_reallocate_the_card_face_to_the_facts_that_vary - Reallocate the card face to the facts that vary
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Fill carries status instead of the stage the column already states; the near-constant understanding/confidence chip leaves the face for age and the blocked reason; progress is drawn, and unexplained markers go.
- Keywords: card fill, status accent, card__badge--metric, understanding confidence, card age, blocked reason, progress bar, card markers
- Use when: Changing what a board card displays on its face, or which visual channel carries which fact.
- Skip when: The metric card component other screens use, or which indicators a document records.

# Problem
- The card fill encodes the stage its column already states; the understanding and confidence chip costs a line on every card and is near-constant across the corpus; nothing says when a card last moved; a blocked card looks like any other; and cards carry coloured markers the screen never explains.

# Scope
- In:
  - Move status onto the fill and accent, and leave stage to the ref prefix that already carries it.
  - Move the understanding and confidence values into the details panel, and put age and the blocked reason on the line they leave.
  - Draw progress rather than printing it, and either label every card marker or remove it.
- Out:
  - The metric card component other screens use, and which indicators a document records.

# Acceptance criteria
- AC4: Fill and accent carry status; stage stays on the ref prefix.
- AC5: The understanding and confidence values are off the card face; age is on it, and the blocked reason when blocked.
- AC6: Progress is drawn, and no unexplained marker remains on a card.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Fill and accent carry status; stage stays on the ref prefix.
- request-AC5 -> This backlog slice. Proof: AC5: The understanding and confidence values are off the card face; age is on it, and the blocked reason when blocked.
- request-AC6 -> This backlog slice. Proof: AC6: Progress is drawn, and no unexplained marker remains on a card.

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
