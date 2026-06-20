## task_247_in_viewer_bootstrap_for_non_bootstrapped_repos - In-viewer bootstrap for non-bootstrapped repos
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
- `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`

# Acceptance criteria
- AC2: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_247_in_viewer_bootstrap_for_non_bootstrapped_repos.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement in-viewer bootstrap for non-bootstrapped repos.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
