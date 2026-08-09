## item_669_extract_mcp_py_tool_definitions_and_flow_help_text_builders_into_their_own_modules - Extract mcp.py TOOL_DEFINITIONS and flow help-text builders into their own modules
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:45:49

# AI Context
- Summary: Extract mcp.py TOOL_DEFINITIONS and flow help-text builders into their own modules
- Keywords: backlog-groom, request, extract mcp.py tool_definitions and flow help-text builders into their own modules, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Extract mcp.py TOOL_DEFINITIONS and flow help-text builders into their own modules.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Two cohesive, already-separable chunks sit inside larger files, past their line-budget ceiling, without a matching extraction. `logics_manager/mcp.py:71-433` (`TOOL_DEFINITIONS`, ~362 lines) is a pure JSON-schema data literal using only the local `_tool_schema()` helper - the file's line-budget entry cites an extraction "attempted and backed out" for the tool *dispatcher* (req_303), but that reasoning does not cover this static schema table, which needs nothing back from `mcp.py` and has no import-cycle risk. `logics_manager/flow/__init__.py:240-741` (~500 lines of pure help-text string builders, `_build_new_help` through `_build_progress_kind_help`) depends only on local formatting helpers defined in the same block, and follows the exact "vocabulary vs. verbs" split the file's own line-budget comment already used to justify splitting `flow/docs.py` out.

# Scope
- In:
  - Move `TOOL_DEFINITIONS` (and only the `_tool_schema()` helper it needs) out of `mcp.py` into a new module (e.g. `mcp_tool_definitions.py`), imported back into `mcp.py`.
  - Move the help-text builder functions out of `flow/__init__.py` into a new module, imported back into `flow/__init__.py`'s `build_parser()`.
  - Prove zero behavior change for both: `mcp serve`'s `tools/list` JSON-RPC response is byte-for-byte identical before and after; every `logics-manager flow <cmd> --help` output is identical before and after.
  - Update `scripts/check-source-line-budget.mjs`'s ledger entries for both files once they shrink under their current ceiling (the guard already supports lowering an entry, per item_626).
- Out:
  - The path-guard consolidation, the coverage-floor fix, the lockfile regeneration, and the `assist_workflow.py` test gap - each is its own sibling backlog item.
  - Any other oversized file in the ledger; only these two named seams are in scope.

# Acceptance criteria
- AC2: `mcp.py`'s `TOOL_DEFINITIONS` literal is extracted to its own module with no behavior change (`mcp serve`'s `tools/list` output is byte-for-byte identical before and after).
- AC3: `flow/__init__.py`'s help-text builders are extracted to their own module with no behavior change (every `--help` output is identical before and after).

# AC Traceability
- request-AC2 -> This backlog slice. Proof: `mcp_tool_definitions.py` created (`TOOL_DEFINITIONS` + `_tool_schema`); `mcp.py` shrank 2246 -> 1859. Verified byte-for-byte identical by diffing `json.dumps(TOOL_DEFINITIONS, sort_keys=True)` against a `git stash` snapshot of the code before the extraction: `IDENTICAL`. `tests/python/test_mcp_and_flow_help_extraction.py::test_tool_definitions_moved_out_of_mcp_module` passed; full mcp test suite (123 tests) passed.
- request-AC3 -> This backlog slice. Proof: `flow/help_text.py` created (all 24 help-builder functions, `build_parser` imported lazily to avoid a circular import); `flow/__init__.py` shrank 3682 -> 3193. Verified byte-for-byte identical by generating every `flow <cmd> --help` output (32 commands) against a `git stash` snapshot: `diff -rq /tmp/help_before /tmp/help_after` → `ALL IDENTICAL`. `tests/python/test_mcp_and_flow_help_extraction.py`'s other 2 tests passed; full flow test suite (162 tests) passed.
- Line-budget ledger lowered both entries automatically (`node scripts/check-source-line-budget.mjs --update`), with a comment added naming this extraction beside each.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_323_review_findings_security_tests_structure_dependencies`
- Primary task(s): `task_320_orchestrate_the_review_findings_cleanup`

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_323_review_findings_security_tests_structure_dependencies` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`.
- Generated locally by logics-manager.
- Task `task_320_orchestrate_the_review_findings_cleanup` was finished via `logics-manager flow finish task` on 2026-08-09.

# Tasks
- `task_320_orchestrate_the_review_findings_cleanup`
