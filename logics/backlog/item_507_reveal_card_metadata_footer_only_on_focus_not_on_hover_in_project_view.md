## item_507_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view - Reveal card metadata footer only on focus not on hover in project view
> From version: 2.13.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
In the project view, the bottom metadata block of each request/item/task card (Theme, Status, Updated) should appear only when the cell is focused, not on mouse hover.
Goal: a calmer, less cluttered grid — the metadata reveals on intentional focus instead of flickering open every time the pointer sweeps across cards.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: In the project view, a card's bottom metadata block (Theme/Status/Updated) stays hidden while the pointer merely hovers the card.
- AC2: The metadata block appears when the card receives focus (keyboard Tab or click) and hides again on blur.
- AC3: Escape still closes an open metadata block (no regression to `renderBoardApp.js:1143-1145`).
- AC4: No change to which fields are shown, their order, or the rest of the card (title, badges, linkage row).
- AC5: Keyboard navigation and the focus-visible outline still work; the card stays reachable and operable.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: In the project view, a card's bottom metadata block (Theme/Status/Updated) stays hidden while the pointer merely hovers the card.
- request-AC2 -> This backlog slice. Proof: AC2: The metadata block appears when the card receives focus (keyboard Tab or click) and hides again on blur.
- request-AC3 -> This backlog slice. Proof: AC3: Escape still closes an open metadata block (no regression to `renderBoardApp.js:1143-1145`).
- request-AC4 -> This backlog slice. Proof: AC4: No change to which fields are shown, their order, or the rest of the card (title, badges, linkage row).
- request-AC5 -> This backlog slice. Proof: AC5: Keyboard navigation and the focus-visible outline still work; the card stays reachable and operable.

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
- Request: `logics/request/req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Reveal card metadata footer only on focus not on hover in project view
- Keywords: backlog-groom, request, reveal card metadata footer only on focus not on hover in project view, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Reveal card metadata footer only on focus not on hover in project view.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view.md`.
- Generated locally by logics-manager.

# Tasks
- `task_277_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`
