## prod_093_trustworthy_flow_checks - Trustworthy flow checks
> Date: 2026-08-14
> Status: Proposed
> Related request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
> Related backlog: `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`, `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`
> Related task: `task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
flow's validation and self-generated writes agree on what counts as a valid, reviewed document.

# Goals
- A passed traceability check means the cited proof actually supports the cited acceptance criterion.
- A finding an operator cannot act on (false drift warning, a repair the tool itself refuses, a lint flag on the tool's own write) says so plainly or stops firing.

# Non-goals
- Semantic or LLM-based proof verification — checks stay deterministic string comparisons over sections already parsed.
- Generating product-level Mermaid diagrams automatically — they remain hand-authored by design.

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
- Product back-reference: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Task back-reference: `task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21`
