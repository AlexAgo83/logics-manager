## task_365_workshop_cdx_close_the_remaining_mockup_gaps - Workshop/CDX: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:22:29

# AI Context
- Summary: Workshop Commands/Explorer and CDX Missions have each shipped most of their approved redesign; this task closes the remaining, concretely-observed gaps.
- Keywords: workshop commands, workshop explorer, cdx missions, quick-filter chips, mission tiles
- Use when: Implementing this task.
- Skip when: Any other screen family — reader/filters, remote/settings, and insights/health/onboarding are separate tasks.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_794_workshop_cdx_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Commands shows per-prefix quick-filter chips (view/build/check/test) above the filter field, and scripts are grouped by their own prefix rather than one generic bucket.
- AC2: Commands rows carry a left accent bar matching the mockup.
- AC3: Explorer no longer shows the plural-in-parentheses wording (`4 item(s)`) when a directory is selected.
- AC4: CDX Missions' top strip shows "Selected" (mission name) / "Session" (session + quota) tiles instead of "Strengths"/"Corpus actions".
- AC5: CDX Missions' right panel shows an always-visible dimmed command preview instead of the toggle-button shape; the disabled launch button states why inline; `Fix directly` has inline consequence text.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_365_workshop_cdx_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_365_workshop_cdx_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
