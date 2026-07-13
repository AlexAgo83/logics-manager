## prod_044_first_class_roadmap_planning - First-class roadmap planning
> Date: 2026-07-13
> Status: Proposed
> Related request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
> Related backlog: `item_553_add_roadmap_document_kind_and_parsing_contract`
> Related task: `task_293_deliver_first_class_roadmap_planning_support`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Add a roadmap planning layer to Logics Manager so operators and AI agents can turn a corpus into ordered product/action milestones such as 0.1, 0.2, 0.3, and 1.0, then inspect and validate that plan in the CLI and viewer.

# Goals
- Represent roadmap milestones as structured Logics docs with stable refs and links.
- Let AI agents propose milestone plans from existing product/spec/backlog context.
- Make milestone sequence and scope visible in the local viewer.
- Keep roadmap planning separate from release evidence while allowing future release linkage.
- Give downstream implementation agents enough validation and context to safely evolve large corpora.

# Non-goals
- Replacing request, backlog, task, product, architecture, or spec docs.
- Implementing a full release management system in this roadmap wave.
- Adding drag-and-drop roadmap editing in the first version.
- Requiring external AI provider integration beyond the existing bounded-context/agent handoff patterns.
- Changing semantic versioning or package release behavior.

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
- Product back-reference: `item_553_add_roadmap_document_kind_and_parsing_contract`
- Task back-reference: `task_293_deliver_first_class_roadmap_planning_support`
