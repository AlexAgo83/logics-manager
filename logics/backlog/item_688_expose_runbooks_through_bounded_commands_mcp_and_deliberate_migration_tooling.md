## item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling - Expose runbooks through bounded commands, MCP, and deliberate migration tooling
> From version: 2.21.4
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 0%
> Complexity: High
> Theme: Runbook command and integration parity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 23:38:00

# AI Context
- Summary: Expose runbooks through bounded commands, MCP, and deliberate migration tooling
- Keywords: scaffolded-backlog, expose runbooks through bounded commands, mcp, and deliberate migration tooling, implementation-ready
- Use when: Implementing the scaffolded slice for Expose runbooks through bounded commands, MCP, and deliberate migration tooling.
- Skip when: The change belongs to another backlog slice.

# Problem
- The current CLI, sync, and MCP surfaces enumerate document kinds independently. A runbook that only one surface understands would be invisible to the tools an agent normally uses for bounded context.
- Legacy migration must be explicit and local to its owning repository; copying every matching document from a workspace would be unsafe and would erase review judgement.

# Scope
- In:
  - Add runbooks to supported list, read, search, context-pack, lint, audit, and MCP document operations.
  - Provide a bounded match operation that ranks Active runbooks against a concise intent, failure symptom, affected path, or task context and includes relevant matches in agent-facing context.
  - Rank exact path, service, command, category, and symptom matches before text matches; return no more than three concise Active results.
  - Return the matching reason with every result. No-match is successful output; matching and capture never become a gate for a task or closeout.
  - Provide a minimal create command and a discover/import flow that previews candidates and imports a selected local source with provenance, category, and review state.
  - Provide an explicit capture flow from current task learning to a Draft runbook; it records source evidence and never promotes the result automatically.
  - Keep import opt-in and repository-bounded; dry-run explains every file that would change.
  - Test CLI and MCP success and rejection paths for runbooks.
- Out:
  - Automatic bulk migration.
  - Reading or writing another repository from the current repository's command invocation.
  - A separate runbook lifecycle command family.
  - Automatic documentation of every code change or promotion of an unverified learning.

# Acceptance criteria
- AC1: `sync read-doc`, `list-docs`, `search-docs`, and context-pack resolve runbooks by ref and kind with bounded output.
- AC2: MCP exposes runbooks through its documented read/list/search paths and rejects unsupported mutation fields safely.
- AC3: Lint and audit inspect runbooks as companions without counting them as open workflow work.
- AC4: A bounded match command returns relevant Active runbooks from intent, symptom, path, or task context, and context-pack or handoff can carry those matches without a full-corpus read.
- AC4a: Match results are capped at three, rank deterministic operational metadata before text similarity, and show trigger, action, verification, and freshness.
- AC4b: Every match carries its reason, no-match is non-error output, and the capture flow can be skipped without changing task state.
- AC5: A discovery command reports local legacy candidates without writing them.
- AC6: Import requires an explicit candidate and metadata, records the source, and has a dry-run that makes no changes; capture creates only a Draft runbook with its task evidence.
- AC7: Tests cover each public surface and prove another repository is not modified or an unverified learning silently promoted.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `sync read-doc`, `list-docs`, `search-docs`, and context-pack resolve runbooks by ref and kind with bounded output.
- request-AC4 -> This backlog slice. Proof: AC4: A bounded match command returns relevant Active runbooks from intent, symptom, path, or task context, and context-pack or handoff can carry those matches without a full-corpus read.
- request-AC7 -> This backlog slice. Proof: AC6: Import requires an explicit candidate and metadata, records the source, and has a dry-run that makes no changes; capture creates only a Draft runbook with its task evidence.
- request-AC8 -> This backlog slice. Proof: AC7: Tests cover each public surface and prove another repository is not modified or an unverified learning silently promoted.
- request-AC9 -> This backlog slice. Proof: AC4b: Every match carries its reason, no-match is non-error output, and the capture flow can be skipped without changing task state.

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
