## task_369_regenerate_the_readme_captures_once_the_fixes_above_land - Regenerate the README captures once the fixes above land
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
- Summary: Once every other task in this request lands, the README's screenshots and captures need regenerating again, same treatment req_355 gave the previous redesign wave.
- Keywords: readme captures, screenshot regeneration, req_355 precedent
- Use when: Implementing this task, after every other task in req_359 is done.
- Skip when: Any of the actual screen fixes — those are the other tasks.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_798_regenerate_the_readme_captures_once_the_fixes_above_land`

# Acceptance criteria
- AC1: Every README capture affected by this request's fixes is regenerated and visibly reflects the fixed screens.
- AC2: This slice is not started until item_790 through item_797 are Done, so it captures the real end state rather than a partial one.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_369_regenerate_the_readme_captures_once_the_fixes_above_land.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_369_regenerate_the_readme_captures_once_the_fixes_above_land.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
