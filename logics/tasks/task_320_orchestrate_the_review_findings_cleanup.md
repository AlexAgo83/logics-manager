## task_320_orchestrate_the_review_findings_cleanup - Orchestrate the review-findings cleanup
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:02:57
> Owner: claude

# AI Context
- Summary: Implement orchestrate the review-findings cleanup.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Context
- Orchestrate the five delivery slices captured by req_323's review findings and keep them linked.

# Plan
- [x] 1. `item_668`: consolidate the four repo-root path-escape guards onto shared `path_utils` primitives.
- [x] 2. `item_669`: extract `mcp.py`'s `TOOL_DEFINITIONS` and `flow/__init__.py`'s help-text builders into their own modules.
- [x] 3. `item_670`: turn the Python coverage floor in `scripts/ci-check.mjs` into a ratchet.
- [x] 4. `item_671`: regenerate `package-lock.json` and add a check against the drift recurring.
- [x] 5. `item_672`: add direct test coverage for `assist_workflow.py`.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and the full test suite pass.

# Backlog
- `item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils`
- `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`
- `item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard`
- `item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring`
- `item_672_add_direct_test_coverage_for_assist_workflow_py`

# Definition of Done (DoD)
- [x] Code is implemented and reviewed.
- [x] Validation passes.
- [x] Linked docs are synchronized.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils`. Proof: see that item's AC Traceability.
- request-AC2 -> `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`. Proof: see that item's AC Traceability.
- request-AC3 -> `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`. Proof: see that item's AC Traceability.
- request-AC4 -> `item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard`. Proof: see that item's AC Traceability.
- request-AC5 -> `item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring`. Proof: see that item's AC Traceability.
- request-AC6 -> `item_672_add_direct_test_coverage_for_assist_workflow_py`. Proof: see that item's AC Traceability.

# Validation
- pytest full suite (1239 tests) + vitest (834 tests) + tsc --noEmit + npm run check:line-budget + npm run check:status-constants + npm run lint:es all passed on 2026-08-09.
- pytest full suite (1239 tests) + vitest (834 tests) + tsc --noEmit + npm run check:line-budget + npm run check:status-constants + npm run lint:es all passed on 2026-08-09
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils`, `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`, `item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard`, `item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring`, `item_672_add_direct_test_coverage_for_assist_workflow_py`
- Related request(s): `req_323_review_findings_security_tests_structure_dependencies`

# Links
- Request: `req_323_review_findings_security_tests_structure_dependencies`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
