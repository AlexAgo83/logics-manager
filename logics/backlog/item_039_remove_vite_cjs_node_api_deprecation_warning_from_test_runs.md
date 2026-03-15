## item_039_remove_vite_cjs_node_api_deprecation_warning_from_test_runs - Remove the Vite CJS Node API deprecation warning from test runs
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
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
- AC1/AC2 -> Vitest now loads its config from an explicit ESM `.mts` file instead of the deprecated CJS Node API path. Proof: `vitest.config.mts`.
- AC3 -> the full local test suite still runs successfully after the config change. Proof: `npm test`.
- AC4 -> the extension smoke checks still pass after the tooling change. Proof: `npm run test:smoke`.
- AC5 -> the module-format change is explicit and maintainable in the project root config files. Proof: `vitest.config.mts`.
- AC6 -> validation commands pass and the previous Vite CJS deprecation warning no longer appears in the test output. Proof: `npm test`, `npm run test:smoke`.

# Priority
- Impact:
  - Medium: improves developer feedback quality and reduces tooling debt.
- Urgency:
  - Medium: not currently blocking, but worth fixing before the warning becomes a harder failure.

# Notes
- Derived from `logics/request/req_034_remove_vite_cjs_node_api_deprecation_warning_from_test_runs.md`.

# Tasks
- `logics/tasks/task_033_remove_vite_cjs_node_api_deprecation_warning_from_test_runs.md`
