## item_452_split_test_logics_manager_cli_py_into_per_domain_test_modules - Split test_logics_manager_cli.py into per-domain test modules
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
`tests/python/test_logics_manager_cli.py` has grown to ~7,214 lines / 240 tests in a single file, slowing reading and feedback: any small viewer change forces scanning a 7k-line module.
The tests already cluster cleanly by domain, so the file can be split with near-zero risk: no application logic moves, only test functions relocate.
Goal: split into per-domain test modules under `tests/python/` to improve readability and navigation, with the suite passing unchanged.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `test_logics_manager_cli.py` is split into per-domain modules; each module groups one coherent domain and stays well under the original size.
- AC2: `pytest tests/python/` collects and passes the same set of tests (same count, no skips introduced) before and after the split.
- AC3: Shared fixtures/helpers are deduplicated into `conftest.py` or a shared helper module rather than copied per file.
- AC4: No production source files are modified.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `test_logics_manager_cli.py` is split into per-domain modules; each module groups one coherent domain and stays well under the original size.
- request-AC2 -> This backlog slice. Proof: AC2: `pytest tests/python/` collects and passes the same set of tests (same count, no skips introduced) before and after the split.
- request-AC3 -> This backlog slice. Proof: AC3: Shared fixtures/helpers are deduplicated into `conftest.py` or a shared helper module rather than copied per file.
- request-AC4 -> This backlog slice. Proof: AC4: No production source files are modified.

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
- Request: `logics/request/req_257_split_test_logics_manager_cli_py_into_per_domain_test_modules.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Split test_logics_manager_cli.py into per-domain test modules
- Keywords: backlog-groom, request, split test_logics_manager_cli.py into per-domain test modules, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Split test_logics_manager_cli.py into per-domain test modules.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_257_split_test_logics_manager_cli_py_into_per_domain_test_modules` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_257_split_test_logics_manager_cli_py_into_per_domain_test_modules.md`.
- Generated locally by logics-manager.

# Tasks
- `task_242_split_test_logics_manager_cli_py_into_per_domain_test_modules`
