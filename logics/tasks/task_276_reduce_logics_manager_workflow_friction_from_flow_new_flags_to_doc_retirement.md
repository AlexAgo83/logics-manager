## task_276_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement - Reduce logics-manager workflow friction from flow-new flags to doc retirement
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 95
> Confidence: 89
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] **Subject 1 (AC1)** — `logics_manager/flow/__init__.py:1541-1545`: replace the hardcoded request-template indicator literals with `getattr(args, ...)` interpolation mirroring `:1611-1616` (status/understanding/confidence/complexity/theme). Keep `From version`/`Schema version` as-is.
- [x] **Subject 2 (AC2)** — `logics_manager/lint.py:558-561`: rewrite the hint to a runnable command (add a real flag placeholder, e.g. `--confidence <n>`) and append the `> Non-semantic edit:` marker alternative (`:53-56`).
- [x] **Subject 3 (AC3)** — add `flow withdraw <doc> --superseded-by <ref>` in `logics_manager/flow/__init__.py` (+ CLI wiring): guarded transition to existing `Obsolete` status (`statuses.json` closed set; verify allowed transition in `statuses.py`) and write the supersede link. Confirm `status`/`audit` already exclude `Obsolete`.
- [x] **Subject 4 (AC4)** — `logics_manager/audit.py` (headline at `:913-931`): add a scoped/active view (`--active` or `dev-ready`) that counts blocking findings only for in-scope, non-terminal docs.
- [x] **Subject 5 (AC5)** — normalize indicator `%` formatting at generation (`flow/__init__.py:1542-1543`, `:1612-1613`); keep `%` as the convention; verify parsers tolerant; pin with a test.
- [x] **AC6** — tests under `tests/python/` for each subject; update golden/fixture files touched by Subjects 1/2/5.
- [x] Validation passes: `lint --require-status` and `audit` green on this repo.

# Backlog
- `item_506_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`

# Acceptance criteria
- AC1: `flow new request --understanding U --confidence C --complexity X --theme T` produces a request whose indicator lines reflect U/C/X/T (no hardcoded `90%`/`85%`/`Medium`/`Operator workflow`); parity with `flow new backlog`/`task`.
- AC2: The lint "modified without updating indicators" hint prints a command that succeeds as-is, and names the `> Non-semantic edit:` marker as the alternative; running the printed command on a drifted doc resolves the finding.
- AC3: `flow withdraw <doc> --superseded-by <ref>` sets a terminal status, drops the doc from `logics-manager status` active work, and stops its ACs from producing blocking traceability findings; the supersede link is recorded and lint stays green.
- AC4: An active/scoped audit view reports blocking issues only for in-scope, non-terminal docs, so a clean active corpus reports zero blocking even when stale out-of-scope docs have findings.
- AC5: Indicator percentage formatting is consistent between generated and hand-authored docs (single convention), and a regression test pins it.
- AC6: New/changed behavior is covered by tests under `tests/python/` and `lint --require-status` + `audit` stay green on this repo.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_276_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement.md` after implementation.
- Finish workflow executed on 2026-06-26.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-26.
- Linked backlog item(s): `item_506_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`
- Related request(s): `req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`

# AI Context
- Summary: Implement reduce logics-manager workflow friction from flow-new flags to doc retirement.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
- request-AC2 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
- request-AC3 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
- request-AC4 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
- request-AC5 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
- request-AC6 -> This task. Proof: task_276 delivered flow new indicator interpolation, lint hint, withdraw, audit active scope, percentage formatting, and tests; validations passed: python -m pytest tests/python/test_flow_cli.py tests/python/test_audit_cli.py tests/python/test_cli_main.py; python -m logics_manager lint --require-status.
