## task_320_orchestrate_the_review_findings_cleanup - Orchestrate the review-findings cleanup
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:02:57

# AI Context
- Summary: Implement orchestrate the review-findings cleanup.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Context
- Orchestrate the five delivery slices captured by req_323's review findings and keep them linked.

# Plan
- [ ] 1. `item_668`: consolidate the four repo-root path-escape guards onto `path_utils.ensure_relative_to()`.
- [ ] 2. `item_669`: extract `mcp.py`'s `TOOL_DEFINITIONS` and `flow/__init__.py`'s help-text builders into their own modules; independent of step 1, can land in any order.
- [ ] 3. `item_670`: turn the Python coverage floor in `scripts/ci-check.mjs` into a real number or a ratchet.
- [ ] 4. `item_671`: regenerate `package-lock.json` and add a check against the drift recurring.
- [ ] 5. `item_672`: add direct test coverage for `assist_workflow.py`.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and the full test suite pass.

# Backlog
- `item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils`
- `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`
- `item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard`
- `item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring`
- `item_672_add_direct_test_coverage_for_assist_workflow_py`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils`. Proof deferred to slice closeout.
- request-AC2 -> `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`. Proof deferred to slice closeout.
- request-AC3 -> `item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules`. Proof deferred to slice closeout.
- request-AC4 -> `item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard`. Proof deferred to slice closeout.
- request-AC5 -> `item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring`. Proof deferred to slice closeout.
- request-AC6 -> `item_672_add_direct_test_coverage_for_assist_workflow_py`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_323_review_findings_security_tests_structure_dependencies`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
