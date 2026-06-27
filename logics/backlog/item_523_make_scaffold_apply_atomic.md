## item_523_make_scaffold_apply_atomic - Make scaffold apply atomic
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85
> Progress: 100%
> Complexity: Medium
> Theme: Tooling robustness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Docs and INDEX are written, then the context pack is built; a failure after the doc writes leaves orphaned md files and a half-updated INDEX, and a re-run reallocates ids.

# Scope
- In:
  - Assemble the full payload (docs + INDEX + context pack) in memory or a staging area, and commit the writes only once everything succeeds
  - On any failure, leave the repository unchanged (no created files, no INDEX edit, no id consumed)
  - Add a fault-injection pytest proving a mid-apply failure rolls back cleanly and a corrected re-run reuses the same ids
- Out:
  - Input validation (sibling slice — most failures should be caught there first)

# Acceptance criteria
- AC1: A forced failure during scaffold leaves the repo byte-identical to before the run.
- AC2: A subsequent successful run reuses the same ids that the failed run would have allocated.
- AC3: A fault-injection pytest exercises the rollback path.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A forced failure during scaffold leaves the repo byte-identical to before the run.
- request-AC2 -> This backlog slice. Evidence needed: --dry-run runs the same input validation as apply (including the context-pack profile/mode check), so a dry-run that passes guarantees the apply will not fail on input errors.
- request-AC4 -> This backlog slice. Evidence needed: flow validate and audit resolve a short ref (e.g. req_285) to its full slug, or fail with a 'did you mean <slug>' hint instead of a bare 'Workflow source not found'.
- request-AC5 -> This backlog slice. Evidence needed: The scaffold input schema is discoverable via a command (a --template or --print-schema) rather than by copying an existing JSON.
- request-AC6 -> This backlog slice. Proof: test_scaffold_robustness.py test_failed_apply_rolls_back_and_reuses_ids covers the atomic-rollback path on a forced mid-apply failure.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)
- Request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Primary task(s): `task_283_orchestrate_scaffold_robustness_hardening`

# AI Context
- Summary: Make scaffold apply atomic
- Keywords: scaffolded-backlog, make scaffold apply atomic, implementation-ready
- Use when: Implementing the scaffolded slice for Make scaffold apply atomic.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_283_orchestrate_scaffold_robustness_hardening`

# Notes
- Task `task_283_orchestrate_scaffold_robustness_hardening` was finished via `logics-manager flow finish task` on 2026-06-27.
