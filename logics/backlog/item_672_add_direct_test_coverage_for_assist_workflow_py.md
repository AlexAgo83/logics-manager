## item_672_add_direct_test_coverage_for_assist_workflow_py - Add direct test coverage for assist_workflow.py
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:02:57

# AI Context
- Summary: Add direct test coverage for assist_workflow.py
- Keywords: backlog-groom, request, add direct test coverage for assist_workflow.py, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add direct test coverage for assist_workflow.py.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`logics_manager/assist_workflow.py` (225 lines - `cmd_request_draft`, `cmd_spec_first_pass`, `cmd_backlog_groom`, `cmd_closure_summary`, `cmd_handoff`, `cmd_next_step`) has no test file that references it by name, and no test asserts on any of these functions' own behavior or edge cases directly. It is exercised transitively through `tests/python/test_assist_cli.py`'s CLI-level invocations (e.g. `main(["assist", "request-draft", ...])`), so this is a precision gap, not a from-zero coverage hole - none of its six command handlers have a test that isolates and asserts on that handler's own dry-run/execute, format, or error-path behavior.

# Scope
- In:
  - Add `tests/python/test_assist_workflow.py` calling each of the six `cmd_*` functions directly (or through `main()` in a way that isolates the one command), covering at minimum: dry-run vs. execute-mode output for `cmd_request_draft`, and one error-path assertion for a command that can fail (e.g. missing/invalid input).
  - Keep the existing CLI-level tests in `test_assist_cli.py` as-is; this adds precision, it does not replace them.
- Out:
  - Any new `assist` subcommand or behavior change to `assist_workflow.py` itself.
  - `clients/vscode/src/logicsCodexWorkflowBootstrapSupport.ts`'s equivalent TypeScript-side gap - out of scope for this Python-only slice; worth a separate look if this pattern is judged worth generalizing.
  - The path-guard consolidation, the mcp.py/flow module extractions, the coverage-floor fix, and the lockfile regeneration - each is its own sibling backlog item.

# Acceptance criteria
- AC6: `assist_workflow.py` gains a dedicated test file exercising its own exported functions directly, not only transitively through CLI-level tests.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: `assist_workflow.py` gains a dedicated test file exercising its own exported functions directly.

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
- Request: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`
- Primary task(s): `task_320_orchestrate_the_review_findings_cleanup`

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_323_review_findings_security_tests_structure_dependencies` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`.
- Generated locally by logics-manager.
