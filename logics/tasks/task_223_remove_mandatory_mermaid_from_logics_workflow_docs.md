## task_223_remove_mandatory_mermaid_from_logics_workflow_docs - Remove mandatory Mermaid from Logics workflow docs
> From version: 2.9.8
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] Workflow templates generate request, backlog, and task docs without mandatory Mermaid blocks.
- [x] Lint and audit behavior accept Mermaid-free workflow docs.
- [x] Legacy workflow Mermaid remains readable or non-blocking during transition.
- [x] Generated graph or viewer functionality still derives relationships from structured workflow links.
- [x] Tests and documentation are updated.
- [x] Validation passes.

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
- PYTHONPATH=. python3.11 -m pytest tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_new_request tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_new_backlog_with_companions tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_deliver_from_product tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_promote_request_to_backlog tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_split_request tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_promote_backlog_to_task tests/python/test_logics_manager_cli.py::test_lint_accepts_changed_workflow_docs_without_mermaid tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_repair_closeout_helpers -vv passed (8 tests).
- PYTHONPATH=. python3.11 -m pytest tests/python/test_logics_manager_cli.py::test_main_runs_native_sync_refresh_mermaid_signatures tests/python/test_logics_manager_cli.py::test_main_runs_native_sync_append_note_reports_mermaid_refresh tests/python/test_logics_manager_cli.py::test_sync_refresh_mermaid_signatures_can_scope_targets tests/python/test_logics_manager_mcp.py::test_mcp_controlled_mutation_tools -vv passed (4 tests).
- PYTHONPATH=. python3.11 -m py_compile logics_manager/flow.py logics_manager/lint.py logics_manager/sync.py logics_manager/mcp.py passed.
- Finish workflow executed on 2026-06-18.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Removed mandatory workflow Mermaid insertion for request/backlog/task generation, made missing Mermaid valid in lint and closeout, kept legacy signature refresh for existing blocks only, and documented Mermaid as optional legacy presentation.
- Finished on 2026-06-18.
- Linked backlog item(s): `item_429_remove_mandatory_mermaid_from_logics_workflow_docs`
- Related request(s): `req_247_remove_mandatory_mermaid_from_logics_workflow_docs`

# AI Context
- Summary: Implement remove mandatory mermaid from logics workflow docs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_247_remove_mandatory_mermaid_from_logics_workflow_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
