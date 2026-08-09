## prod_069_ai_context_that_a_bounded_read_actually_reaches - AI Context that a bounded read actually reaches
> Date: 2026-08-09
> Status: Proposed
> Related request: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
> Related backlog: `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`, `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`
> Related task: `task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Fix a self-defeating design detail: the one section written specifically to help an agent decide fast whether a doc is relevant (`# AI Context`) is placed near the end of every doc template, exactly where the tool's own default bounded reads (`flow show`, `read_logics_doc`) are least likely to reach. Move it ahead of the truncation boundary for new docs, and give existing docs a deterministic repair path via the autofix-structure mechanism that already exists.

# Goals
- AI Context survives a default-budget bounded read on any doc, regardless of the doc's total length.
- New docs get this right from generation, not just from a follow-up repair.
- Existing docs get a deterministic, idempotent, on-demand repair - no new command, reuse of the existing autofix-structure path.
- No other section's content or order is disturbed by the repair.

# Non-goals
- Making truncation itself section-aware (e.g. always including AI Context regardless of position); repositioning is the simpler fix and needs no truncation-logic changes.
- Reordering any other section beyond AI Context.
- Changing the default --max-chars budget or the diff-preview budget.
- A bulk one-shot rewrite of the entire corpus as part of this request; the repair path is opt-in and on-demand, run whenever the operator chooses.

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
- Product back-reference: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Task back-reference: `task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary`
