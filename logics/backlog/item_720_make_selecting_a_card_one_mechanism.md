## item_720_make_selecting_a_card_one_mechanism - Make selecting a card one mechanism
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A click currently sets a weak border, expands an inline preview that repeats the panel header, and grows the card so the column jumps; make it select and open the panel, and nothing else.
- Keywords: card--preview-open, card selection, inline preview, layout shift, details panel coupling
- Use when: Changing what happens when a card is clicked, or how the selected card is drawn.
- Skip when: How the panel is dismissed, and keyboard navigation across cards.

# Problem
- A click sets a one-pixel border that competes with the coloured borders every stage already has, expands an inline preview that repeats the panel's own header, and grows the card so every card below it moves under the pointer.

# Scope
- In:
  - One outcome per click: select, and open the panel.
  - A selected state unmistakable among cards of every stage, tying the card visually to the panel.
  - Retire the inline preview and the height change that came with it.
- Out:
  - How the panel is dismissed, and keyboard navigation across cards.

# Acceptance criteria
- AC7: Click selects and opens the panel only; the selected card is unmistakable; no height change; no duplicated facts.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: Click selects and opens the panel only; the selected card is unmistakable; no height change; no duplicated facts.

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
