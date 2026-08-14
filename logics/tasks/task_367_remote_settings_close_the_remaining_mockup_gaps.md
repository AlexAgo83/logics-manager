## task_367_remote_settings_close_the_remaining_mockup_gaps - Remote/Settings: close the remaining mockup gaps
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
- Summary: Git/CI/Release/Settings have each shipped most of their approved redesign (verdict banners, duplicate tile removal, cost-stating copy); this task closes the remaining diff-colouring, duplicate-tile, and toggle-styling gaps.
- Keywords: git diff colour, ci job sorting, release gate wording, settings toggle styling
- Use when: Implementing this task.
- Skip when: Any other screen family.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_796_remote_settings_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Git diffs are colour-coded (additions/deletions/hunk headers distinguishable), no longer hard-truncate without a way to see the rest, and show a per-file diffstat with the ability to scope to one file.
- AC2: CI drops the old duplicate tile row and sorts jobs slowest-first with a relative-duration indicator.
- AC3: Release's blocking gate is described once, consistently, gates render as a compact wrap-grid instead of stacked full-width blocks, `npm_publication` shows its "optional" annotation, and the old duplicate tile row is dropped.
- AC4: Settings' "Automatic refresh" is a real toggle switch with a "last refreshed" readout, ChatGPT Developer Mode is an inline toggle, `Stop viewer` is visually distinguished as destructive, and `Copy diagnostics` uses a quiet/secondary style.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_367_remote_settings_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_367_remote_settings_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
