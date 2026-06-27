## prod_035_scaffold_tooling_robustness - Scaffold tooling robustness
> Date: 2026-06-27
> Status: Proposed
> Related request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
> Related backlog: `item_522_pre_flight_validate_scaffold_input_and_share_the_path_with_dry_run`, `item_523_make_scaffold_apply_atomic`, `item_524_resolve_short_workflow_refs_in_validate_and_audit`, `item_525_surface_the_scaffold_input_schema_via_a_command`
> Related task: `task_283_orchestrate_scaffold_robustness_hardening`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Harden flow scaffold request-chain so bad input fails fast with a clear message before any write, applies atomically, resolves short refs, and exposes its input schema — driven by the concrete failure modes hit while dogfooding the scaffolder.

# Goals
- Fail before writing, not mid-apply, on any invalid input.
- Guarantee all-or-nothing scaffolds so ids and INDEX never end up half-updated.
- Make the tool self-documenting and forgiving about ref shorthand.

# Non-goals
- Changing the scaffold input schema or the shape of generated docs.
- Changing context-pack content, modes, or profile semantics beyond validating the value.
- Reworking ref formats used elsewhere in the CLI.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Task back-reference: `task_283_orchestrate_scaffold_robustness_hardening`
