## item_697_show_every_workshop_section_in_the_viewer_workshop_menu - Show every Workshop section in the viewer Workshop menu
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Show every Workshop section in the viewer Workshop menu
- Keywords: backlog-groom, request, show every workshop section in the viewer workshop menu, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Show every Workshop section in the viewer Workshop menu.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Reported by the operator, 2026-08-11: "in the viewer, in the Workshop menu I don't have the Runbook button and I have to go into one of the screens to find it in the slider — that's a pain."
Every Workshop section should be reachable in one gesture from the Workshop menu. Runbooks currently costs two: open a section that *is* listed, then locate Runbooks in the tab strip.
Runbooks are the newest surface (`req_330`), which makes this the section most likely to be looked for and least likely to be found.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Runbooks is reachable in one gesture from the Workshop menu, opening the same panel the tab strip opens.
- AC2: The Workshop menu is derived from the `workshopTabs` registry rather than hand-written per entry, so its contents and order follow the registry by construction.
- AC3: A section added to `workshopTabs` appears in the menu with no edit to `index.html`.
- AC4: Existing menu behaviour is unchanged — the project tools below the separator, their hidden states, keyboard navigation, and the `role="menu"` / `role="menuitem"` semantics all survive.
- AC5: A test fails if any registry section has no menu entry, and covers activation of the Runbooks entry end to end.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Runbooks is reachable in one gesture from the Workshop menu, opening the same panel the tab strip opens.
- request-AC2 -> This backlog slice. Proof: AC2: The Workshop menu is derived from the `workshopTabs` registry rather than hand-written per entry, so its contents and order follow the registry by construction.
- request-AC3 -> This backlog slice. Proof: AC3: A section added to `workshopTabs` appears in the menu with no edit to `index.html`.
- request-AC4 -> This backlog slice. Proof: AC4: Existing menu behaviour is unchanged — the project tools below the separator, their hidden states, keyboard navigation, and the `role="menu"` / `role="menuitem"` semantics all survive.
- request-AC5 -> This backlog slice. Proof: AC5: A test fails if any registry section has no menu entry, and covers activation of the Runbooks entry end to end.

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
- Request: `logics/request/req_336_show_every_workshop_section_in_the_viewer_workshop_menu.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_336_show_every_workshop_section_in_the_viewer_workshop_menu` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_336_show_every_workshop_section_in_the_viewer_workshop_menu.md`.
- Generated locally by logics-manager.
- Task `task_333_show_every_workshop_section_in_the_viewer_workshop_menu` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_333_show_every_workshop_section_in_the_viewer_workshop_menu`
