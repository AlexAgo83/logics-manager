## item_687_define_the_runbook_companion_contract_and_agent_discovery_path - Define the runbook companion contract and agent discovery path
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Runbook contract and discovery
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-11 00:58:35

# AI Context
- Summary: Define the runbook companion contract and agent discovery path
- Keywords: scaffolded-backlog, define the runbook companion contract and agent discovery path, implementation-ready
- Use when: Implementing the scaffolded slice for Define the runbook companion contract and agent discovery path.
- Skip when: The change belongs to another backlog slice.

# Problem
- Runbooks are currently ordinary project documentation, so an agent has no reliable place to look and cannot distinguish a maintained operational procedure from a historical note.
- Adding a folder alone would repeat the problem: the generated instructions and index are the surfaces an agent sees before it can know to search that folder.

# Scope
- In:
  - Define the `run_` companion kind, canonical directory, minimal template, Draft/Active/Archived statuses, category vocabulary, verification field, reusable-problem/solution fields, and structural link rules — as a new entry in the existing kind/status/companion-creation machinery (`Kind`, `stage_statuses`, `flow companion <kind>`), not a parallel document type system.
  - Add runbook recognition to the shared validation and document parsing contracts without lifecycle progress or promotion semantics.
  - Make bootstrap-generated repository instructions name the canonical runbook directory and bounded match/list/search commands, including the instruction to consult relevant runbooks before operational work and to record one manually with `flow companion runbook` after verifying a reusable procedure.
  - Add a runbook collection to the generated Logics index.
  - Add small contract tests for the template, validation, generated instructions, and index.
- Out:
  - Viewer rendering and graph work.
  - MCP or CLI migration commands.
  - Migrating any existing sibling-project document.
  - Any automated capture pipeline from task history — runbook creation is always the deliberate, manual `flow companion runbook` path.

# Acceptance criteria
- AC1: A runbook document has a stable `run_` ref, lives in `logics/runbook/`, and validates as a companion document with category and verification metadata.
- AC2: Runbook statuses are limited to Draft, Active, and Archived, with no progress, promotion, owner, or closeout requirement; only Active runbooks are normal match results.
- AC3: Bootstrap output tells an agent the runbook location, the match/list/search commands, and to consult applicable runbooks before operational changes and record one manually with `flow companion runbook` after verifying a reusable procedure.
- AC4: `logics-manager index` renders a runbook section with category and verification information.
- AC5: Tests fail if the runbook contract or agent discovery wording disappears.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A runbook document has a stable `run_` ref, lives in `logics/runbook/`, and validates as a companion document with category and verification metadata.
- request-AC2 -> This backlog slice. Proof: AC2: Runbook statuses are limited to Draft, Active, and Archived, with no progress, promotion, owner, or closeout requirement; only Active runbooks are normal match results.
- request-AC7 -> This backlog slice. Proof: AC3: Bootstrap output tells an agent the runbook location, the match/list/search commands, and to consult applicable runbooks before operational changes and record one manually with `flow companion runbook` after verifying a reusable procedure.
- request-AC8 -> This backlog slice. Proof: AC5: Tests fail if the runbook contract or agent discovery wording disappears.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_074_a_discoverable_library_of_operational_runbooks`
- Architecture decision(s): (none yet)
- Request: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
- Primary task(s): `task_327_orchestrate_the_discoverable_runbook_library_delivery`

# Priority
- Priority: High - every later surface needs one stable document model and location
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_327_orchestrate_the_discoverable_runbook_library_delivery`

# Notes
- Task `task_327_orchestrate_the_discoverable_runbook_library_delivery` was finished via `logics-manager flow finish task` on 2026-08-11.
