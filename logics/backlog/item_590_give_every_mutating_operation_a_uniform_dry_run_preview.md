## item_590_give_every_mutating_operation_a_uniform_dry_run_preview - Give every mutating operation a uniform dry-run preview
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Mutation safety contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Some mutating tools support a dry-run preview and others apply immediately, with no principle distinguishing them.
- An external wrapper had to state 'no dry run available, this takes effect immediately' in three separate tool descriptions, which pushes an internal inconsistency onto every caller.

# Scope
- In:
  - Add dry-run support to every mutating tool that lacks it, including request creation and the two promotion tools.
  - Return a preview payload describing the documents that would be created or changed, using the same shape as the tools that already support it.
  - Keep the existing default for each tool so that omitting the flag does not change current behavior.
  - Mirror the flag on the corresponding CLI commands where one exists.
- Out:
  - Transactional rollback of an applied mutation.
  - Changing which tools are considered mutating.
  - Making dry-run the default for tools that currently apply immediately.

# Acceptance criteria
- AC1: Every mutating tool accepts a dry-run argument and returns a preview without writing to disk.
- AC2: Preview payloads share one shape across tools, listing affected paths and refs.
- AC3: A dry run followed by an apply on unchanged inputs produces exactly the documents the preview described.
- AC4: Omitting the flag preserves each tool's current default behavior.
- AC5: Tests assert no filesystem writes occur during a dry run for each mutating tool.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Every mutating tool accepts a dry-run argument and returns a preview without writing to disk.
- request-AC9 -> This backlog slice. Proof: AC2: Preview payloads share one shape across tools, listing affected paths and refs.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Give every mutating operation a uniform dry-run preview
- Keywords: scaffolded-backlog, give every mutating operation a uniform dry-run preview, implementation-ready
- Use when: Implementing the scaffolded slice for Give every mutating operation a uniform dry-run preview.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - closes an inconsistency automation has to document around
- Rationale: Set by scaffold input or defaulted for grooming.
