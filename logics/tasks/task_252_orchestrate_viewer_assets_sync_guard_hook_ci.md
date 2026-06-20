## task_252_orchestrate_viewer_assets_sync_guard_hook_ci - Orchestrate viewer_assets sync guard (hook + CI)
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Coordinate the AC-aware split backlog items without implementing them directly.

# Plan
- [ ] 1. Review the generated backlog slices and request AC mapping.
- [ ] 2. Promote or implement the next highest-priority slice.
- [ ] 3. Keep validation and request traceability updated as slices close.

# Backlog
- `item_460_local_pre_commit_hook_guarding_viewer_assets_sync`
- `item_461_fail_loud_ci_check_on_viewer_assets_drift`

# Definition of Done (DoD)
- [x] Generated backlog slices are linked and ready for implementation.
- [x] Slice ownership and next action are clear.
- [x] Validation passes.

# AC Traceability
- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.
- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.
- request-AC7 -> This task. Proof: generated task is covered by split request tests.
- request-AC1 -> This task. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check
- request-AC3 -> This task. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check
- request-AC4 -> This task. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_460_local_pre_commit_hook_guarding_viewer_assets_sync`, `item_461_fail_loud_ci_check_on_viewer_assets_drift`
- Related request(s): `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check`

# AI Context
- Summary: Orchestrate viewer_assets sync guard (hook + CI)
- Keywords: ac-aware-split, orchestration-task, generated-task
- Use when: Coordinating the generated backlog slices from an AC-aware request split.
- Skip when: Implementing one individual backlog slice.

# Links
- Request: `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
