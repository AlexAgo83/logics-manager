## item_524_resolve_short_workflow_refs_in_validate_and_audit - Resolve short workflow refs in validate and audit
> From version: 2.14.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
