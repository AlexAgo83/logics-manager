## prod_111_connector_project_onboarding_context - Connector project onboarding context
> Date: 2026-08-23
> Status: Settled
> Related request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
> Related backlog: `item_859_expose_one_read_only_onboard_project_mcp_tool`
> Related task: `task_394_orchestrate_connector_project_onboarding_context`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-23 12:58:13

# Overview
Give the ChatGPT MCP connector a small, reliable project-onboarding surface: one read-only call tells the model where it is, what Logics work is active, what changed recently, what it can read next, and how to target another project. The context stays derived from Logics and Git instead of becoming a manually maintained assistant summary.

```mermaid
flowchart LR
  Probe[onboard_project] --> State[Project and active work]
  State --> Activity[Recent Logics and Git activity]
  State --> Sources[Source pointers]
  Sources --> Search[search_project_context]
  Sources --> Read[read_project_resource]
```

# Goals
- Make the first connector call answer 'what project and active work can I actually see?' with evidence.
- Expose semantic project context without giving the model broad, unbounded repository access.
- Let the model navigate projects and deepen context through sourced, bounded follow-up calls.
- Keep implementation on existing Logics Manager primitives: status, sync/context-pack, viewer project registry, MCP dispatch, and Git viewer helpers.

# Non-goals
- A free-form AI-written project encyclopedia.
- A full source-code indexing engine or vector database.
- New authentication behavior for the connector; durability/OAuth/toggle work belongs to the existing connector request.
- Mutating workflow docs, changing active tasks, or editing project files from onboarding tools.
- Guaranteeing perfect architecture understanding from one call; the first version provides enough sourced context to ask and answer responsibly.

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
- Product back-reference: `item_859_expose_one_read_only_onboard_project_mcp_tool`
- Task back-reference: `task_394_orchestrate_connector_project_onboarding_context`
