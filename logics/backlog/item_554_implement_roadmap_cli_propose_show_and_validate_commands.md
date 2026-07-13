## item_554_implement_roadmap_cli_propose_show_and_validate_commands - Implement roadmap CLI propose, show, and validate commands
> From version: 2.18.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: High
> Theme: Roadmap planning CLI
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Operators need a repeatable CLI path for creating and maintaining roadmap plans, and AI agents need deterministic inputs/outputs instead of ad hoc chat plans.

# Scope
- In:
  - Add a `logics-manager roadmap` command group with `propose`, `show`, and `validate` subcommands, or an equivalent `flow roadmap ...` surface if that better matches local CLI conventions.
  - Implement `roadmap propose` using bounded corpus context from product, request, backlog, task, spec, and architecture docs.
  - Let `roadmap propose` write a new roadmap doc or dry-run JSON/text output with exact linked refs and assumptions.
  - Implement `roadmap show <road-ref>` with a compact milestone summary and linked refs.
  - Implement `roadmap validate <road-ref>` for duplicate milestone labels, broken refs, empty scope, unknown statuses, missing exit criteria, and release/roadmap terminology confusion.
  - Keep the command safe for agents: support `--dry-run`, bounded output, and no automatic changes outside `logics/roadmap/` unless explicitly requested.
  - Add help text and tests for command routing, dry-run, write mode, and validation findings.
- Out:
  - Calling a remote LLM directly from the CLI.
  - Auto-editing every linked request/backlog/task in the first pass.
  - Publishing releases or tags.

# Acceptance criteria
- AC1: `logics-manager roadmap propose --dry-run` returns a milestone plan without writing files.
- AC2: `logics-manager roadmap propose --write` creates `logics/roadmap/road_###_*.md` with stable refs and exact linked Logics refs.
- AC3: `logics-manager roadmap show <ref>` prints milestone labels, goals, statuses, linked refs, and validation gates.
- AC4: `logics-manager roadmap validate <ref>` exits nonzero on broken refs or malformed milestone sections and prints actionable findings.
- AC5: Tests cover empty corpus, existing roadmap, and a CR-League-shaped corpus fixture.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `logics-manager roadmap propose --dry-run` returns a milestone plan without writing files.
- request-AC4 -> This backlog slice. Proof: AC2: `logics-manager roadmap propose --write` creates `logics/roadmap/road_###_*.md` with stable refs and exact linked Logics refs.
- request-AC5 -> This backlog slice. Proof: AC3: `logics-manager roadmap show <ref>` prints milestone labels, goals, statuses, linked refs, and validation gates.
- request-AC8 -> This backlog slice. Proof: AC4: `logics-manager roadmap validate <ref>` exits nonzero on broken refs or malformed milestone sections and prints actionable findings.
- request-AC9 -> This backlog slice. Proof: AC5: Tests cover empty corpus, existing roadmap, and a CR-League-shaped corpus fixture.
- request-AC10 -> This backlog slice. Proof: AC5: Tests cover empty corpus, existing roadmap, and a CR-League-shaped corpus fixture.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)
- Request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
- Primary task(s): `task_293_deliver_first_class_roadmap_planning_support`

# AI Context
- Summary: Implement roadmap CLI propose, show, and validate commands
- Keywords: scaffolded-backlog, implement roadmap cli propose, show, and validate commands, implementation-ready
- Use when: Implementing the scaffolded slice for Implement roadmap CLI propose, show, and validate commands.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
