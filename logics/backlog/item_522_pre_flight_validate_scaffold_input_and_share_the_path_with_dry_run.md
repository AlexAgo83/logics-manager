## item_522_pre_flight_validate_scaffold_input_and_share_the_path_with_dry_run - Pre-flight validate scaffold input and share the path with dry-run
> From version: 2.14.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Tooling robustness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- context_pack.profile (and other enum/required fields) are only checked deep inside the context-pack build, under `if not dry_run:`, so an invalid value passes --dry-run and then throws a bare KeyError mid-apply.

# Scope
- In:
  - Add a validate_scaffold_input pass that checks required keys and enum domains (profile in {tiny,normal,deep}, complexity, context_pack.mode) and raises a readable error naming the field and allowed values
  - Call it at the very start of scaffold_request_chain_payload for BOTH dry-run and apply, before any write
  - Make _context_profile_limit raise a clear ValueError listing the allowed profiles instead of indexing a dict directly
- Out:
  - Atomic rollback of writes (sibling slice)
  - Schema discovery command (sibling slice)

# Acceptance criteria
- AC1: An unknown profile (or missing required key) is rejected before any doc is written, with a message naming the field and the valid values.
- AC2: --dry-run and apply run the identical input validation, so a green dry-run cannot be followed by an input-error apply failure.
- AC3: A pytest covers invalid-profile rejection and dry-run/apply parity.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: An unknown profile (or missing required key) is rejected before any doc is written, with a message naming the field and the valid values.
- request-AC2 -> This backlog slice. Proof: AC2: --dry-run and apply run the identical input validation, so a green dry-run cannot be followed by an input-error apply failure.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)
- Request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Primary task(s): `task_283_orchestrate_scaffold_robustness_hardening`

# AI Context
- Summary: Pre-flight validate scaffold input and share the path with dry-run
- Keywords: scaffolded-backlog, pre-flight validate scaffold input and share the path with dry-run, implementation-ready
- Use when: Implementing the scaffolded slice for Pre-flight validate scaffold input and share the path with dry-run.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
