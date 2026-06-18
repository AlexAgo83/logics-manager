## task_230_add_deterministic_validation_repair_and_fixable_diagnostics - Add deterministic validation repair and fixable diagnostics
> From version: 2.8.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_436_add_deterministic_validation_repair_and_fixable_diagnostics`

# Acceptance criteria
- AC1: `flow validate` can report lint and audit state together for selected refs.
- AC2: Output distinguishes blocking, warning, fixable, unsafe, and informational findings.
- AC3: `--apply-fixes` repairs deterministic issues without touching unrelated workflow docs.
- AC4: Mermaid repair applies the exact expected signatures instead of only reporting them.
- AC5: Tests cover applied fix, dry-run, ambiguous fix refusal, and no-unrelated-doc-churn behavior.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_230_add_deterministic_validation_repair_and_fixable_diagnostics.md` after implementation.
- PYTHONPATH=. python3.11 -m logics_manager lint --require-status passed; PYTHONPATH=. python3.11 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc passed.
- PYTHONPATH=. python3.11 -m pytest tests/python/test_logics_manager_cli.py::test_flow_validate_reports_and_applies_scoped_fixable_diagnostics tests/python/test_logics_manager_cli.py::test_flow_validate_dry_run_does_not_apply_fix tests/python/test_logics_manager_cli.py::test_flow_validate_refuses_ambiguous_ac_traceability_fix -q passed (3 tests).
- Finish workflow executed on 2026-06-19.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-19.
- Linked backlog item(s): `item_436_add_deterministic_validation_repair_and_fixable_diagnostics`
- Related request(s): `req_249_improve_logics_workflow_scaffolding_validation_agent_docs`

# AI Context
- Summary: Implement add deterministic validation repair and fixable diagnostics.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_249_improve_logics_workflow_scaffolding_validation_agent_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
