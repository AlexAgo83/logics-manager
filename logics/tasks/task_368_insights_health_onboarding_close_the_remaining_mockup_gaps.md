## task_368_insights_health_onboarding_close_the_remaining_mockup_gaps - Insights/Health/Onboarding: close the remaining mockup gaps
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
- Summary: Insights, Health, and Getting Started have each shipped substantial parts of their approved redesign; this task closes the remaining tile-shape, grouping, and action-button gaps.
- Keywords: insights verdict card, health fixable count, stat tile strip, getting started action pair
- Use when: Implementing this task.
- Skip when: Any other screen family.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_797_insights_health_onboarding_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Insights' summary card shows a `verdict--ok/warn/bad` treatment with an inline primary action button; stat tiles render as a thin horizontal strip; "Flow health" is grouped into "needs a decision" vs. "expected while work is in flight", with the latter visually dimmed.
- AC2: Health shows a "Fixable" count, and "Apply fixes…" states how many findings it would address; stat tiles render as a thin strip.
- AC3: Each Getting Started stage offers a create-action + look-action pair, not a single button.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_368_insights_health_onboarding_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_368_insights_health_onboarding_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
