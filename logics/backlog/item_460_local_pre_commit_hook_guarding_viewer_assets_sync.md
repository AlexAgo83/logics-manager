## item_460_local_pre_commit_hook_guarding_viewer_assets_sync - Local pre-commit hook guarding viewer_assets sync
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
- AC1: A versioned local git hook runs `check:viewer-assets` on pre-commit and blocks the commit when `clients/viewer/` and `logics_manager/viewer_assets/viewer/` are out of sync, printing the exact remediation command (`npm run sync:viewer-assets`).
- AC3: Enabling the hook is one frictionless step (documented `npm run setup-hooks` or auto-wired via `prepare`), opt-in-safe for contributors who do not run it, and changes no existing script behavior.
- AC4: No regression — `check:viewer-assets` exits non-zero only on real drift; existing build/test scripts are unaffected.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A versioned local git hook runs `check:viewer-assets` on pre-commit and blocks the commit when `clients/viewer/` and `logics_manager/viewer_assets/viewer/` are out of sync, printing the exact remediation command (`npm run sync:viewer-assets`).
- request-AC3 -> This backlog slice. Proof: AC3: Enabling the hook is one frictionless step (documented `npm run setup-hooks` or auto-wired via `prepare`), opt-in-safe for contributors who do not run it, and changes no existing script behavior.
- request-AC4 -> This backlog slice. Proof: AC4: No regression — `check:viewer-assets` exits non-zero only on real drift; existing build/test scripts are unaffected.

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
- Request: `logics/request/req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Local pre-commit hook guarding viewer_assets sync
- Keywords: backlog-groom, request, local pre-commit hook guarding viewer_assets sync, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Local pre-commit hook guarding viewer_assets sync.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check.md`.
- Generated locally by logics-manager.

# Tasks
- `task_252_orchestrate_viewer_assets_sync_guard_hook_ci`
- `task_253_local_pre_commit_hook_guarding_viewer_assets_sync`
