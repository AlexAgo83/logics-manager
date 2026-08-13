## item_720_make_selecting_a_card_one_mechanism - Make selecting a card one mechanism
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:05:30

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

# Delivery notes
- Retiring the inline preview deleted seven functions that existed only to feed it, so the file's line ceiling came down 140 rather than staying where its worst moment had put it.
- Nothing the preview showed was dropped. Two facts had no other home and were moved rather than lost: **suggested actions**, which now render as their own section in the details panel, and **recency**, which `item_719` had already put on the card face as a permanent age segment while the panel keeps the absolute date. "Unlinked to primary flow" was already stated better by the panel, which says it and offers the link.
- `setSelectedId` in `mainApp.js` is the single point selection is set from the board, so it is where the two halves of "select and open" stay together. A selection made while the panel is collapsed used to be a click with no visible outcome.
- The selected state is an outline rather than a border change: drawn outside the box, it cannot be mistaken for the coloured border a stage carries or the status accent on the left edge, and it costs no layout. Verified against the real corpus: card height 70px before and after the click, and the card below it did not move.
- Two defects found and fixed while checking the result. The age segment only rendered when a metric pill already existed for an unrelated indicator, so a card with no metrics showed no age -- age is a fact every card has. And a companion document, carrying neither progress nor complexity, drew a pill reading `P - / -`; it now reports the age instead.

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
