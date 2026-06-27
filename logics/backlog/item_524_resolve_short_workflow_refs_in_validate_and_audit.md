## item_524_resolve_short_workflow_refs_in_validate_and_audit - Resolve short workflow refs in validate and audit
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85
> Progress: 100%
> Complexity: Low
> Theme: Developer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- flow validate / audit raise 'Workflow source not found: req_285' for a short numeric ref; only the full slug resolves, unlike the rest of the CLI.

# Scope
- In:
  - Resolve a short ref (stage + number, e.g. req_285) to its unique full-slug doc before the not-found error
  - When the short ref is ambiguous or missing, fail with a 'did you mean <slug>' hint listing the candidates
  - Add a pytest for exact short-ref resolution and the ambiguous/missing hint
- Out:
  - Changing ref formats used elsewhere in the CLI

# Acceptance criteria
- AC1: flow validate req_285 resolves to req_285_<full_slug>.
- AC2: An ambiguous or missing short ref prints candidate slugs instead of a bare not-found.
- AC3: A pytest covers both paths.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: flow validate req_285 resolves to req_285_<full_slug>.
- request-AC2 -> This backlog slice. Evidence needed: --dry-run runs the same input validation as apply (including the context-pack profile/mode check), so a dry-run that passes guarantees the apply will not fail on input errors.
- request-AC3 -> This backlog slice. Evidence needed: Apply is atomic: if any step fails, no partial docs or INDEX changes remain and no ids are consumed, so a corrected re-run reuses the same ids.
- request-AC5 -> This backlog slice. Evidence needed: The scaffold input schema is discoverable via a command (a --template or --print-schema) rather than by copying an existing JSON.
- request-AC6 -> This backlog slice. Proof: test_scaffold_robustness.py test_short_ref_resolves_to_full_slug + test_missing_short_ref_lists_candidates cover short-ref resolution and the did-you-mean hint.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)
- Request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Primary task(s): `task_283_orchestrate_scaffold_robustness_hardening`

# AI Context
- Summary: Resolve short workflow refs in validate and audit
- Keywords: scaffolded-backlog, resolve short workflow refs in validate and audit, implementation-ready
- Use when: Implementing the scaffolded slice for Resolve short workflow refs in validate and audit.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_283_orchestrate_scaffold_robustness_hardening`

# Notes
- Task `task_283_orchestrate_scaffold_robustness_hardening` was finished via `logics-manager flow finish task` on 2026-06-27.
