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
> Indicators reviewed: 2026-08-11 05:09:10

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

# AC Traceability
- request-AC1 -> This task. Proof: Runbooks now has its own menu entry, generated with the rest; the new test `opens the Runbooks panel from the Workshop menu in one gesture` clicks it and asserts the runbooks tab reports `aria-selected="true"`. Source: `50fa5abd`
- request-AC2 -> This task. Proof: `index.html` no longer carries any `workshop:` entry; `renderWorkshopMenuItems` (render.js) maps `workshopTabs` and index.js inserts the result before the project-tools separator at init. Source: `50fa5abd`
- request-AC3 -> This task. Proof: The test compares the rendered entry ids to the ids parsed out of `workshopTabs` in constants.js with `toEqual`, so order and membership both follow the registry; it also asserts index.html contains no `data-viewer-nav-target="workshop:` at all. Source: `50fa5abd`
- request-AC4 -> This task. Proof: Same test asserts the separator sits at index `entries.length` (project tools still below it) and that every generated entry carries `role="menuitem"`; the pre-existing project-capabilities test, which drives the hidden states and the menu toggle, still passes. Source: `50fa5abd`
- request-AC5 -> This task. Proof: `tests/viewer.browser-host.test.ts` gained both: the registry-coverage test fails if any section has no entry, and the activation test drives Runbooks end to end. Full file 190 passed; `npm run check:viewer-host` and `check:line-budget` pass. Source: `50fa5abd`

# Links
- Request: `req_336_show_every_workshop_section_in_the_viewer_workshop_menu`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
