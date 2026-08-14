## task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip - Fleet project switcher: icon buttons show a clashing native browser tooltip
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:31:08

# AI Context
- Summary: The fleet project switcher's icon-only buttons (favorite star, remove fleet root) rely on the native `title` attribute for their hint, producing the browser's own plain tooltip that overlaps adjacent row text and clashes with the app's dark theme.
- Keywords: native title tooltip, viewer-project-switcher__favorite, fleet root remove, icon button hint
- Use when: Implementing this task.
- Skip when: Anything about Fleet home's layout/content itself — that's req_359/item_791, unrelated.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_799_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`

# Acceptance criteria
- AC1: Hovering (or focusing) the "remove fleet root" button shows a hint that is styled consistently with the viewer's own dark theme, not the browser's native tooltip, and does not overlap the row's own text.
- AC2: The favorite-star button's hint (Add/Remove favorite) gets the same treatment, since it has the identical root cause.
- AC3: The hint remains available to assistive tech (the existing `aria-label` is preserved or the replacement mechanism is equally accessible).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_370_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_361_fleet_project_switcher_icon_buttons_show_a_clashing_native_browser_tooltip`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
