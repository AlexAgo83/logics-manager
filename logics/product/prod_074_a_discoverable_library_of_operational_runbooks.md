## prod_074_a_discoverable_library_of_operational_runbooks - A discoverable library of operational runbooks
> Date: 2026-08-10
> Status: Proposed
> Related request: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
> Related backlog: `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`, `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`, `item_689_make_the_runbook_library_navigable_in_the_viewer`
> Related task: `task_327_orchestrate_the_discoverable_runbook_library_delivery`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-10 23:22:22

# Overview
Give Logics a companion runbook document: a small, durable operational library with stable locations, categories, verification dates, and links to the delivery work that created or changed it. An agent learns the location from generated repository instructions, an operator discovers it through the index or bounded commands, and the viewer renders the library as a category-to-runbook graph without confusing it with the delivery chain.

# Goals
- Make runbooks discoverable to people and agents before operational work begins.
- Preserve the simple Markdown runbook form while adding only the metadata needed for discovery and freshness.
- Expose one consistent runbook type across CLI, MCP, validation, and viewer surfaces.
- Support deliberate migration in the repository that owns each legacy runbook.
- Make a verified operational discovery reusable: agents find it before repeating the investigation and capture it after solving a genuinely repeatable problem.

# Non-goals
- Migrating or editing runbooks in sibling repositories from this delivery.
- Giving runbooks backlog progress, task ownership, promotion, or closeout behavior.
- Building a central cross-repository document vault.
- Replacing the existing request-to-task chain graph.
- Automatically promoting unverified agent notes into trusted operational guidance.

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
- Product back-reference: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
- Task back-reference: `task_327_orchestrate_the_discoverable_runbook_library_delivery`
