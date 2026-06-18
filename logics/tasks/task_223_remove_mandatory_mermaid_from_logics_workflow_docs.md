## task_223_remove_mandatory_mermaid_from_logics_workflow_docs - Remove mandatory Mermaid from Logics workflow docs
> From version: 2.9.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] Workflow templates generate request, backlog, and task docs without mandatory Mermaid blocks.
- [ ] Lint and audit behavior accept Mermaid-free workflow docs.
- [ ] Legacy workflow Mermaid remains readable or non-blocking during transition.
- [ ] Generated graph or viewer functionality still derives relationships from structured workflow links.
- [ ] Tests and documentation are updated.
- [ ] Validation passes.

# Backlog
- `item_429_remove_mandatory_mermaid_from_logics_workflow_docs`

# Acceptance criteria
- AC1: New request, backlog, and task templates no longer include mandatory Mermaid blocks.
- AC2: `logics-manager lint` no longer requires Mermaid kind or signature comments for workflow docs.
- AC3: Existing workflow docs with Mermaid remain readable and do not become blocking failures during the migration window.
- AC4: Relationship graph functionality remains available through generated CLI or viewer output derived from workflow links.
- AC5: Documentation explains that Mermaid is optional or legacy in workflow docs and not the authoritative source of flow state.
- AC6: Migration behavior is explicit: either remove existing workflow Mermaid blocks with a command or tolerate them as non-blocking legacy content.

# AC Traceability
- request-AC1 -> This task. Proof: AC1 covers removing mandatory Mermaid blocks from request, backlog, and task template generation.
- request-AC2 -> This task. Proof: AC2 covers updating lint behavior so workflow docs without Mermaid metadata pass.
- request-AC3 -> This task. Proof: AC3 covers legacy workflow docs with Mermaid remaining readable or non-blocking during migration.
- request-AC4 -> This task. Proof: AC4 covers preserving relationship graph functionality through generated CLI or viewer output from structured links.
- request-AC5 -> This task. Proof: AC5 covers documentation that Mermaid is optional or legacy and not workflow source data.
- request-AC6 -> This task. Proof: AC6 covers choosing and documenting the migration path for existing workflow Mermaid blocks.

# Implementation steps
- Identify workflow template generation paths in `logics_manager/flow.py` and related helpers.
- Remove Mermaid block generation from new request, backlog, and task templates.
- Update lint rules so missing Mermaid kind and signature comments are valid for workflow docs.
- Update signature refresh behavior so Mermaid-free docs are skipped cleanly.
- Verify audit rules use structured links for request, backlog, and task relationships instead of Mermaid blocks.
- Preserve or add generated graph support through CLI or viewer code using structured workflow relationships.
- Decide and document the legacy migration behavior.
- Update tests in `tests/python/test_logics_manager_cli.py` or adjacent suites to cover Mermaid-free workflow docs.

# Edge cases
- Existing docs with Mermaid should not fail just because their generated signature is stale after an unrelated edit.
- Docs without Mermaid should not receive empty placeholder code fences.
- ADR and product docs should keep their existing Mermaid behavior unless a separate request changes it.
- Commands that previously refreshed Mermaid signatures should report useful output when no Mermaid blocks are present.

# Validation
- Run targeted unit tests for flow generation, linting, audit, and Mermaid signature refresh.
- Run `logics-manager lint --require-status`.
- Run `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`.
- Run `logics-manager flow finish task logics/tasks/task_223_remove_mandatory_mermaid_from_logics_workflow_docs.md` after implementation.

# Report
- Not started.

# AI Context
- Summary: Implement remove mandatory mermaid from logics workflow docs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_247_remove_mandatory_mermaid_from_logics_workflow_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
