## item_739_make_list_mode_a_table - Make list mode a table
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 14:18:13

# AI Context
- Summary: List mode is the card layout stretched: an 82px row for one line of text, the title in the left third, the middle half empty, and the near-constant metric chip pinned about 1 500px away at the far edge.
- Keywords: list mode, board--list, list-view, table columns, metric chip placement, mode toggle label
- Use when: Changing the board's list mode, its row layout, or the control that switches between modes.
- Skip when: The card mode's own layout, which is covered by the card-face slice.

# Problem
List mode renders a row about 82px tall to carry one line of text: the title sits in the left third, the middle half is empty, and the `U __% / C __%` chip is pinned to the far right edge, roughly 1 500px from the title it describes.
So the entire right half of the screen is spent on the one value already measured to be almost constant, and pairing a document with its metrics means crossing the whole viewport. A list is a table; this one has no columns.
The mode toggle is an unlabelled icon titled "Switch project display mode". Which mode is active, and which one switching would reach, are both unstated.
# Scope
- In:
  - Give the list real columns that earn the width: status, links and age beside the title.
  - Encode the same facts the same way as card mode, so switching changes the shape and not the meaning.
  - State the current mode and the mode the control would switch to.
- Out:
  - The card mode's own layout, and which documents the board shows.
# Acceptance criteria
- AC16: List mode presents documents as a table with columns that earn the width -- at least status, links and age beside the title -- rather than a stretched card whose only right-hand content is pinned to the far edge.
- AC17: Card mode and list mode encode the same facts the same way, so switching mode changes the shape of the screen and not what it means; and the current mode, and the mode switching would reach, are both stated.

# AC Traceability
- request-AC16 -> This backlog slice. Proof: AC16: List mode presents documents as a table with columns that earn the width -- at least status, links and age beside the title -- rather than a stretched card whose only right-hand content is pinned to the far edge.
- request-AC17 -> This backlog slice. Proof: AC17: Card mode and list mode encode the same facts the same way, so switching mode changes the shape of the screen and not what it means; and the current mode, and the mode switching would reach, are both stated.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_345_make_the_project_view_lead_with_the_work_that_is_live` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`.
- Generated locally by logics-manager.
