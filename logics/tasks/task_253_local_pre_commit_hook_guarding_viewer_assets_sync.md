## task_253_local_pre_commit_hook_guarding_viewer_assets_sync - Local pre-commit hook guarding viewer_assets sync
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
- `item_460_local_pre_commit_hook_guarding_viewer_assets_sync`

# Acceptance criteria
- AC1: A versioned local git hook runs `check:viewer-assets` on pre-commit and blocks the commit when `clients/viewer/` and `logics_manager/viewer_assets/viewer/` are out of sync, printing the exact remediation command (`npm run sync:viewer-assets`).
- AC3: Enabling the hook is one frictionless step (documented `npm run setup-hooks` or auto-wired via `prepare`), opt-in-safe for contributors who do not run it, and changes no existing script behavior.
- AC4: No regression — `check:viewer-assets` exits non-zero only on real drift; existing build/test scripts are unaffected.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_253_local_pre_commit_hook_guarding_viewer_assets_sync.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement local pre-commit hook guarding viewer_assets sync.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
