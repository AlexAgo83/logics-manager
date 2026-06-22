## prod_026_importable_module_remediation - Importable module remediation
> Date: 2026-06-22
> Status: Proposed
> Related request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
> Related backlog: `item_482_reunite_numbered_part_python_modules_into_importable_code`, `item_483_convert_viewer_and_flow_part_glue_into_real_packages`, `item_484_retune_the_source_line_budget_guardrail`
> Related task: `task_270_orchestrate_the_exec_part_glue_remediation`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Replace the runtime exec(compile) part-glue across seven modules with ordinary Python imports, restoring tooling support without changing behavior.

# Goals
- Restore tracebacks, IDE navigation, type-checking, and static analysis on the largest Python modules.
- Reunite line-count-driven _01.._04 fragments into cohesive importable modules.
- Re-tune the line-budget guardrail so it encourages real decomposition instead of text-glue.

# Non-goals
- Changing runtime behavior, public APIs, or CLI output.
- Introducing any new runtime dependency or framework.
- Refactoring generated or vendored artifacts.

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
- Product back-reference: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Task back-reference: `task_270_orchestrate_the_exec_part_glue_remediation`
