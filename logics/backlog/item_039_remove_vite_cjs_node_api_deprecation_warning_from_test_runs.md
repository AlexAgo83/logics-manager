## item_039_remove_vite_cjs_node_api_deprecation_warning_from_test_runs - Remove the Vite CJS Node API deprecation warning from test runs
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Low
> Theme: Tooling hygiene and test-run clarity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The project test suite currently emits a Vite warning about the deprecated CJS build of Vite's Node API. The suite still passes, but the warning adds noise and weakens the signal quality of test output.

This should be treated as tooling debt rather than harmless clutter. If left in place, it can hide real issues in the output and increase the risk of future breakage when the deprecated path is eventually removed upstream.

# Scope
- In:
  - Identify why the test setup hits the deprecated Vite CJS Node API path.
  - Update the project to use a supported Vite/Vitest integration path.
  - Preserve local test execution and smoke-test behavior.
  - Keep the resulting setup explicit and maintainable.
- Out:
  - Broad dependency churn unrelated to the warning.
  - Suppressing the warning without removing the cause.
  - Refactoring unrelated application code.

# Acceptance criteria
- AC1: Running the project test suite no longer emits the Vite CJS Node API deprecation warning.
- AC2: The fix uses a supported Vite/Vitest path rather than cosmetic suppression.
- AC3: Existing local test execution still works after the change.
- AC4: Existing smoke-test or packaging-related workflows do not regress.
- AC5: Any required config/module-format change remains explicit and maintainable.
- AC6: Validation commands still pass after the warning is removed.

# AC Traceability
- AC1/AC2 -> test/tooling config is moved off the deprecated CJS Node API path. Proof: TODO.
- AC3 -> local automated test commands still run successfully after the change. Proof: TODO.
- AC4 -> smoke/package-adjacent workflows are validated after the tooling change. Proof: TODO.
- AC5 -> config/module-format changes are captured cleanly in project files. Proof: TODO.
- AC6 -> validation commands pass with clean output. Proof: TODO.

# Priority
- Impact:
  - Medium: improves developer feedback quality and reduces tooling debt.
- Urgency:
  - Medium: not currently blocking, but worth fixing before the warning becomes a harder failure.

# Notes
- Derived from `logics/request/req_034_remove_vite_cjs_node_api_deprecation_warning_from_test_runs.md`.

# Tasks
- `logics/tasks/task_033_remove_vite_cjs_node_api_deprecation_warning_from_test_runs.md`
