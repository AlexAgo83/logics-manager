## task_229_make_request_splitting_ac_aware_and_task_orchestration_friendly - Make request splitting AC-aware and task-orchestration friendly
> From version: 2.8.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_435_make_request_splitting_ac_aware_and_task_orchestration_friendly`

# Acceptance criteria
- AC1: `split request` can accept per-slice AC mappings without requiring manual item rewrites.
- AC2: Generated items include slice-specific problem, scope, ACs, and AC Traceability.
- AC3: Promotion or split can create an orchestration task with custom title, summary, and linked role.
- AC4: JSON output includes created refs, AC mappings, and task links.
- AC5: Tests cover valid mapping, unknown AC, duplicate mapping, omitted AC, and orchestration task options.

# AC Traceability
- request-AC1 -> `task_225_add_rich_request_chain_scaffolding_for_development_ready_logics_work`. Proof: Rich request-chain scaffold was implemented in the first slice.
- request-AC2 -> This task. Proof: Added AC-aware `split request --slice` mappings and optional orchestration task generation.
- request-AC3 -> This task. Proof: Added deterministic validation for unknown and duplicate AC mappings.
- request-AC4 -> `task_225_add_rich_request_chain_scaffolding_for_development_ready_logics_work`. Proof: The scaffold slice generated context-pack handoff output.
- request-AC5 -> This task. Proof: Structured JSON output includes created refs, AC mappings, omitted ACs, and orchestration task links.
- request-AC6 -> This task. Proof: Mapping input is explicit, bounded, and rejects ambiguous duplicate or unknown ACs.
- request-AC7 -> This task. Proof: Tests cover valid mapping, unknown AC, duplicate AC, omitted AC reporting, and orchestration task options.
- request-AC8 -> This task. Proof: Flow help documents `--slice` and `--orchestration-task` for the one-pass workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_229_make_request_splitting_ac_aware_and_task_orchestration_friendly.md` after implementation.
- PYTHONPATH=. python3.11 -m pytest tests/python/test_logics_manager_cli.py::test_main_runs_native_flow_split_request tests/python/test_logics_manager_cli.py::test_flow_split_request_accepts_ac_mappings_and_orchestration_task tests/python/test_logics_manager_cli.py::test_flow_split_request_rejects_unknown_ac_mapping tests/python/test_logics_manager_cli.py::test_flow_split_request_rejects_duplicate_ac_mapping -vv passed (4 tests).
- PYTHONPATH=. python3.11 -m py_compile logics_manager/flow.py tests/python/test_logics_manager_cli.py passed.
- Finish workflow executed on 2026-06-19.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Implemented AC-aware split request options with per-slice AC mappings, omitted AC reporting, duplicate/unknown AC validation, structured JSON output, and optional orchestration task generation.
- Finished on 2026-06-19.
- Linked backlog item(s): `item_435_make_request_splitting_ac_aware_and_task_orchestration_friendly`
- Related request(s): `req_249_improve_logics_workflow_scaffolding_validation_agent_docs`

# AI Context
- Summary: Implement make request splitting ac-aware and task-orchestration friendly.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_249_improve_logics_workflow_scaffolding_validation_agent_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
