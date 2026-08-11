## task_333_show_every_workshop_section_in_the_viewer_workshop_menu - Show every Workshop section in the viewer Workshop menu
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement show every workshop section in the viewer workshop menu.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_697_show_every_workshop_section_in_the_viewer_workshop_menu`

# Acceptance criteria
- AC1: Runbooks is reachable in one gesture from the Workshop menu, opening the same panel the tab strip opens.
- AC2: The Workshop menu is derived from the `workshopTabs` registry rather than hand-written per entry, so its contents and order follow the registry by construction.
- AC3: A section added to `workshopTabs` appears in the menu with no edit to `index.html`.
- AC4: Existing menu behaviour is unchanged — the project tools below the separator, their hidden states, keyboard navigation, and the `role="menu"` / `role="menuitem"` semantics all survive.
- AC5: A test fails if any registry section has no menu entry, and covers activation of the Runbooks entry end to end.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_333_show_every_workshop_section_in_the_viewer_workshop_menu.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_333_show_every_workshop_section_in_the_viewer_workshop_menu.md` after implementation.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_697_show_every_workshop_section_in_the_viewer_workshop_menu`
- Related request(s): `req_336_show_every_workshop_section_in_the_viewer_workshop_menu`

# Links
- Request: `req_336_show_every_workshop_section_in_the_viewer_workshop_menu`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
