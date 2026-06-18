## item_435_make_request_splitting_ac_aware_and_task_orchestration_friendly - Make request splitting AC-aware and task-orchestration friendly
> From version: 2.8.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
`flow split request` creates sibling backlog items, but agents still have to rewrite each item and manually map request ACs to the right slice. Task promotion also lacks orchestration-friendly metadata such as custom title and role.

# Scope
- In:
  - AC-aware split options
  - generated per-slice scope and AC traceability
  - orchestration task creation with custom title/summary
  - structured JSON output naming refs and mappings
- Out:
  - full rich scaffold command implementation
  - automatic task implementation


```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|make-request-splitting-ac-aware-and-task|req-249-improve-logics-workflow-scaffold|flow-split-request-creates-sibling-backl|ac1-split-request-can-accept-per-slice
flowchart TD
    Request[Request ACs] --> Mapping[Slice AC mapping]
    Mapping --> Items[Backlog items]
    Items --> Orchestration[Orchestration task]
```

# Acceptance criteria
- AC1: `split request` can accept per-slice AC mappings without requiring manual item rewrites.
- AC2: Generated items include slice-specific problem, scope, ACs, and AC Traceability.
- AC3: Promotion or split can create an orchestration task with custom title, summary, and linked role.
- AC4: JSON output includes created refs, AC mappings, and task links.
- AC5: Tests cover valid mapping, unknown AC, duplicate mapping, omitted AC, and orchestration task options.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: Provides AC-aware splitting and orchestration task metadata.
- request-AC6 -> This backlog slice. Proof: Keeps mappings explicit and rejects ambiguous input.
- request-AC7 -> This backlog slice. Proof: Defines mapping and task option test coverage.
- request-AC8 -> This backlog slice. Evidence needed: Documentation and CLI help show the recommended one-pass workflow for turning a product conversation into development-ready Logics corpus.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): `logics/product/prod_023_agent_authored_logics_workflow_scaffolding_and_validation.md`
- Architecture decision(s): (none yet)
- Request: `req_249_improve_logics_workflow_scaffolding_validation_agent_docs`
- Primary task(s): `task_229_make_request_splitting_ac_aware_and_task_orchestration_friendly`

# AI Context
- Summary: Add AC-aware request splitting and orchestration task metadata so generated backlog items do not need manual traceability rewrites.
- Keywords: ac-aware-split, orchestration-task, request-traceability, structured-json, flow-promote
- Use when: Use when implementing or reviewing the delivery slice for Make request splitting AC-aware and task-orchestration friendly.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact: High
- Urgency: High

# Notes
- Hybrid rationale: Derived from request `req_249_improve_logics_workflow_scaffolding_validation_agent_docs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_249_improve_logics_workflow_scaffolding_validation_agent_docs.md`.
- Generated locally by logics-manager.
- Task `task_229_make_request_splitting_ac_aware_and_task_orchestration_friendly` was finished via `logics-manager flow finish task` on 2026-06-19.

# Tasks
- `task_229_make_request_splitting_ac_aware_and_task_orchestration_friendly`

# Validation
- Covered by split request tests for valid mapping, unknown AC, duplicate AC, omitted AC reporting, and orchestration task output.
