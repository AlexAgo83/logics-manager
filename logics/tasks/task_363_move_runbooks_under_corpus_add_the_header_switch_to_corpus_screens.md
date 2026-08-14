## task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens - Move Runbooks under Corpus, add the header switch to Corpus screens
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
- Summary: Runbooks is currently under Workshop; it belongs under Corpus. Corpus screens are also missing the header selection switch every other top-level screen already carries.
- Keywords: navigation restructure, runbooks placement, corpus header switch, viewer toolbar
- Use when: Implementing this task.
- Skip when: Any specific screen's internal content — this is navigation placement only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_792_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens`

# Acceptance criteria
- AC1: Runbooks is reachable from the Corpus navigation group, not the Workshop one.
- AC2: Every Corpus screen carries the same header selection switch present on other top-level screens (e.g. Activity/Project).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
