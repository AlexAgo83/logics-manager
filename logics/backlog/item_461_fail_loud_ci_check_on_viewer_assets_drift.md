## item_461_fail_loud_ci_check_on_viewer_assets_drift - Fail-loud CI check on viewer_assets drift
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The viewer ships as two copies: source under `clients/viewer/` and the served package copy under `logics_manager/viewer_assets/viewer/`, kept in sync by `scripts/dev/sync-viewer-assets.mjs`. Editing the source without re-syncing means changes silently do not reach the running viewer — a recurring "my change didn't take effect" friction across sessions.
A `check:viewer-assets` script exists (`sync-viewer-assets.mjs --check`) but nothing enforces it: there is no local git hook, and the publish CI runs the *sync* (auto-fixes drift) rather than `--check` (fails on drift), so out-of-sync copies can land in commits unnoticed.
This request adds a frictionless local guard plus a fail-loud CI check so drift is caught at commit time and can never land.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC2: CI fails loudly on drift — the test/publish workflow runs `check:viewer-assets` (`--check`) so out-of-sync copies cannot land, instead of silently re-syncing.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: CI fails loudly on drift — the test/publish workflow runs `check:viewer-assets` (`--check`) so out-of-sync copies cannot land, instead of silently re-syncing.
- request-AC1 -> This backlog slice. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check
- request-AC3 -> This backlog slice. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check
- request-AC4 -> This backlog slice. Proof: Implemented in commit a938b2a; npm run check:viewer-assets passes (in sync); pre-commit hook blocks on drift; CI uses --check

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check`
- Primary task(s): `task_254_fail_loud_ci_check_on_viewer_assets_drift`

# AI Context
- Summary: Fail-loud CI check on viewer_assets drift
- Keywords: backlog-groom, request, fail-loud ci check on viewer_assets drift, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Fail-loud CI check on viewer_assets drift.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check.md`.
- Generated locally by logics-manager.
- Task `task_254_fail_loud_ci_check_on_viewer_assets_drift` was finished via `logics-manager flow finish task` on 2026-06-20.
- Task `task_252_orchestrate_viewer_assets_sync_guard_hook_ci` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_252_orchestrate_viewer_assets_sync_guard_hook_ci`
- `task_254_fail_loud_ci_check_on_viewer_assets_drift`
