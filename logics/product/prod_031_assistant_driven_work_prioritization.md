## prod_031_assistant_driven_work_prioritization - Assistant-driven work prioritization
> Date: 2026-06-26
> Status: Proposed
> Related request: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
> Related backlog: `item_509_parse_item_priority_and_order_status_output_by_it`, `item_510_populate_item_priority_on_authoring_and_scaffolding`, `item_511_show_item_priority_as_a_viewer_card_badge`, `item_512_teach_the_assistant_to_set_and_plan_by_priority`
> Related task: `task_279_orchestrate_assistant_driven_item_prioritization`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Give the existing item `# Priority` block real meaning: parse a single priority tier per backlog item and let `logics-manager status` recommend work in priority order, with tasks inheriting their item's priority.

# Goals
- Make the next-work signal reflect importance, not file order.
- Keep priority a single grooming decision at the item level, inherited downstream.
- Revive the already-present `# Priority` block instead of inventing a parallel system.

# Non-goals
- A weighted Impact x Urgency scoring engine or any numeric ranking model.
- A dependency graph / topological ordering between subjects (Status: Blocked covers the rare case).
- Per-task priority fields competing with item priority.
- Editable priority from inside the viewer (read-only display only).
- Any new runtime dependency.

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
- Product back-reference: `req_282_let_the_assistant_prioritize_execution_order_of_backlog_items`
- Task back-reference: `task_279_orchestrate_assistant_driven_item_prioritization`
