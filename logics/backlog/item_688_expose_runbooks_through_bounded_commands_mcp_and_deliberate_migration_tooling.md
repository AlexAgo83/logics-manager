## item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling - Expose runbooks through bounded commands, MCP, and deliberate migration tooling
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: High
> Theme: Runbook command and integration parity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-11 00:58:35

# AI Context
- Summary: Expose runbooks through bounded commands, MCP, and deliberate migration tooling
- Keywords: scaffolded-backlog, expose runbooks through bounded commands, mcp, and deliberate migration tooling, implementation-ready
- Use when: Implementing the scaffolded slice for Expose runbooks through bounded commands, MCP, and deliberate migration tooling.
- Skip when: The change belongs to another backlog slice.

# Problem
- The current CLI, sync, and MCP surfaces enumerate document kinds independently. A runbook that only one surface understands would be invisible to the tools an agent normally uses for bounded context.
- Without a bounded match operation, finding the right runbook still means a full-corpus read; a document type nobody can query cheaply does not save an agent any work.

# Scope
- In:
  - Add runbooks to supported list, read, search, context-pack, lint, audit, and MCP document operations, extending the existing generic per-kind handling used by product/roadmap/architecture — no new document-operation surface.
  - Provide a bounded `match` operation implemented as a thin wrapper over the existing document search (filter to `kind=runbook`, `status=Active`): boost rows whose category, path, service, command, or symptom field exactly matches a query term ahead of plain text matches, cap at three results, and attach the matching reason to each.
  - No-match is successful, non-error output; matching never becomes a gate for a task or closeout.
  - Test CLI and MCP success and rejection paths for runbooks.
- Out:
  - Automatic bulk migration, cross-repository discovery/import tooling, or reading/writing another repository from this repository's command invocation.
  - An automatic capture-from-task-learning flow. Runbooks are created with the existing `flow companion runbook` path, same as any other companion kind.
  - A separate runbook lifecycle command family.
  - A bespoke ranking/scoring engine beyond the documented field-priority wrapper over existing search.

# Acceptance criteria
- AC1: `sync read-doc`, `list-docs`, `search-docs`, and context-pack resolve runbooks by ref and kind with bounded output.
- AC2: MCP exposes runbooks through its documented read/list/search paths and rejects unsupported mutation fields safely.
- AC3: Lint and audit inspect runbooks as companions without counting them as open workflow work.
- AC4: A bounded `match` command, built on top of existing document search, returns at most three relevant Active runbooks from an intent, symptom, path, or task context; results rank exact category/path/service/command/symptom field matches before plain text matches, each carries its matching reason, and no-match is non-error output. Context-pack or handoff can carry those matches without a full-corpus read.
- AC5: Tests cover each public surface for runbooks, including the match command's ranking, cap, and no-match behavior.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `sync read-doc`, `list-docs`, `search-docs`, and context-pack resolve runbooks by ref and kind with bounded output.
- request-AC4 -> This backlog slice. Proof: AC4: A bounded `match` command returns relevant Active runbooks from intent, symptom, path, or task context, ranked and explained, without a full-corpus read.
- request-AC8 -> This backlog slice. Proof: AC5: Tests cover each public surface for runbooks, including the match command's ranking, cap, and no-match behavior.
- request-AC9 -> This backlog slice. Proof: AC4: every match carries its reason and no-match is non-error output.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_074_a_discoverable_library_of_operational_runbooks`
- Architecture decision(s): (none yet)
- Request: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
- Primary task(s): `task_327_orchestrate_the_discoverable_runbook_library_delivery`

# Priority
- Priority: High - a documented type is not useful if agents and integrations cannot query it
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_327_orchestrate_the_discoverable_runbook_library_delivery`

# Notes
- Task `task_327_orchestrate_the_discoverable_runbook_library_delivery` was finished via `logics-manager flow finish task` on 2026-08-11.
