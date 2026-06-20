## task_254_fail_loud_ci_check_on_viewer_assets_drift - Fail-loud CI check on viewer_assets drift
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_461_fail_loud_ci_check_on_viewer_assets_drift`

# Acceptance criteria
- AC2: CI fails loudly on drift — the test/publish workflow runs `check:viewer-assets` (`--check`) so out-of-sync copies cannot land, instead of silently re-syncing.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_254_fail_loud_ci_check_on_viewer_assets_drift.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement fail-loud ci check on viewer_assets drift.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
