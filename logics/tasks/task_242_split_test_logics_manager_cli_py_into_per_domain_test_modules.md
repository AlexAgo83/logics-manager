## task_242_split_test_logics_manager_cli_py_into_per_domain_test_modules - Split test_logics_manager_cli.py into per-domain test modules
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_452_split_test_logics_manager_cli_py_into_per_domain_test_modules`

# Acceptance criteria
- AC1: `test_logics_manager_cli.py` is split into per-domain modules; each module groups one coherent domain and stays well under the original size.
- AC2: `pytest tests/python/` collects and passes the same set of tests (same count, no skips introduced) before and after the split.
- AC3: Shared fixtures/helpers are deduplicated into `conftest.py` or a shared helper module rather than copied per file.
- AC4: No production source files are modified.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_242_split_test_logics_manager_cli_py_into_per_domain_test_modules.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement split test_logics_manager_cli.py into per-domain test modules.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_257_split_test_logics_manager_cli_py_into_per_domain_test_modules`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
