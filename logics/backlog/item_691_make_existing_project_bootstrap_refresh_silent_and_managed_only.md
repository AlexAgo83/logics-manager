## item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only - Make existing-project bootstrap refresh silent and managed-only
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Bootstrap maintenance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-11 01:46:59

# AI Context
- Summary: Make existing-project bootstrap refresh silent and managed-only
- Keywords: scaffolded-backlog, make existing-project bootstrap refresh silent and managed-only, implementation-ready
- Use when: Implementing the scaffolded slice for Make existing-project bootstrap refresh silent and managed-only.
- Skip when: The change belongs to another backlog slice.

# Problem
- Bootstrap maintenance is currently presented as a runtime update and can interrupt startup, even though existing initialized projects only need bounded generated-artifact refresh.

# Scope
- In:
  - Define `bootstrap --refresh-managed --check` and apply behavior that identifies whether generated files or marked managed regions need updating before writing.
  - Run the apply path silently only for an existing valid corpus after a resolved-runtime version change or a detected managed-artifact drift.
  - Preserve user-owned text and unmanaged files; surface a compact status only when managed files changed or refresh failed.
  - Keep first-time initialization explicit and retain explicit commands for manual repair.
- Out:
  - Silent Git initialization, commits, or branch changes.
  - Silent creation of a missing corpus.
  - Broad document fixing outside bootstrap-managed artifacts.

# Acceptance criteria
- AC1: Existing valid corpora refresh managed bootstrap output through the CLI-managed refresh path without a popup and without changing user-owned content.
- AC2: A project with no `logics/` corpus receives no automatic writes and offers an explicit Initialize Logics action.
- AC3: Tests prove that silent refresh cannot invoke Git initialization, commit, global publication, or unbounded document writes.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Existing valid corpora refresh managed bootstrap output without a popup and without changing user-owned content.
- request-AC5 -> This backlog slice. Proof: AC2: A project with no `logics/` corpus receives no automatic writes and offers an explicit Initialize Logics action.
- request-AC6 -> This backlog slice. Proof: AC3: Tests prove that silent refresh cannot invoke Git initialization, commit, global publication, or unbounded document writes.
- request-AC9 -> This backlog slice. Proof: AC3: Tests prove that silent refresh cannot invoke Git initialization, commit, global publication, or unbounded document writes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Primary task(s): `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`

# Notes
- Task `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification` was finished via `logics-manager flow finish task` on 2026-08-11.
