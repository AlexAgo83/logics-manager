## task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track - Redesign the viewer's scrollbars: custom, discreet, no visible track
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:18:28

# AI Context
- Summary: Add a shared `::-webkit-scrollbar`/`-thumb`/`-track` (plus `scrollbar-width`/`scrollbar-color` fallback) rule block to the viewer's CSS, covering every scrollable region: thin, discreet thumb, no visible track.
- Keywords: scrollbar, ::-webkit-scrollbar, scrollbar-width, scrollbar-color
- Use when: Implementing this task.
- Skip when: Any change to scroll behaviour/content -- this is the scrollbar's paint only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_803_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`

# Acceptance criteria
- AC1: Every scrollable region in the viewer (document panel, board columns, workshop panels, modals, reader contents nav, and any other scrollable container) renders the same custom scrollbar style, not the browser/OS default.
- AC2: The scrollbar's track never shows a visible background -- only the thumb is visible, and only a thin, discreet one.
- AC3: The custom scrollbar renders consistently across the browsers/hosts the viewer targets (standalone Chromium-based browser, VS Code webview).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_374_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_363_redesign_the_viewer_s_scrollbars_custom_discreet_no_visible_track`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
