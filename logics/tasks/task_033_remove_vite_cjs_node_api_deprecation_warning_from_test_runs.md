## task_033_remove_vite_cjs_node_api_deprecation_warning_from_test_runs - Remove the Vite CJS Node API deprecation warning from test runs
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Low
> Theme: Tooling hygiene and test-run clarity
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_039_remove_vite_cjs_node_api_deprecation_warning_from_test_runs`.
- Source file: `logics/backlog/item_039_remove_vite_cjs_node_api_deprecation_warning_from_test_runs.md`.
- Related request(s): `req_034_remove_vite_cjs_node_api_deprecation_warning_from_test_runs`.

```mermaid
flowchart LR
    Backlog[Backlog source] --> Diagnose[Identify deprecated Vite path]
    Diagnose --> Config[Adjust config/module format]
    Config --> Validate[Run tests and smoke checks]
    Validate --> Clean[Confirm warning is gone]
    Clean --> Docs[Update linked Logics docs]
```

# Plan
- [ ] 1. Identify the exact config or module-format reason Vitest is using the deprecated Vite CJS Node API path.
- [ ] 2. Update the relevant config or package/module setup to use the supported path.
- [ ] 3. Verify that local tests still run correctly after the change.
- [ ] 4. Verify that smoke-test or adjacent validation workflows still behave correctly.
- [ ] 5. Confirm the warning is actually gone from test output.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 1 and 2.
- AC3 -> Step 3.
- AC4 -> Step 4.
- AC5 -> Step 2.
- AC6 -> Steps 3, 4, and 5.

# Links
- Backlog item: `item_039_remove_vite_cjs_node_api_deprecation_warning_from_test_runs`
- Request(s): `req_034_remove_vite_cjs_node_api_deprecation_warning_from_test_runs`

# Validation
- `npm test`
- `npm run test:smoke`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
