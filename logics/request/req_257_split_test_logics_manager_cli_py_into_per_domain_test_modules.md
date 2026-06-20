## req_257_split_test_logics_manager_cli_py_into_per_domain_test_modules - Split test_logics_manager_cli.py into per-domain test modules
> From version: 2.11.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- `tests/python/test_logics_manager_cli.py` has grown to ~7,214 lines / 240 tests in a single file, slowing reading and feedback: any small viewer change forces scanning a 7k-line module.
- The tests already cluster cleanly by domain, so the file can be split with near-zero risk: no application logic moves, only test functions relocate.
- Goal: split into per-domain test modules under `tests/python/` to improve readability and navigation, with the suite passing unchanged.

# Context
- Observed domain clusters (by `test_<domain>_*` prefix): viewer (83), main (71), flow (17), workshop (9), sync (7), render (6), followups (6), assist (5), audit (4), plus smaller groups (product, create, validate, repair, root...).
- Proposed target modules: `test_viewer_cli.py`, `test_flow_cli.py`, `test_workshop_cli.py`, `test_sync_cli.py`, `test_audit_cli.py`, `test_assist_cli.py`, and a residual `test_cli_main.py` for the `main`/misc group.
- Shared fixtures/helpers move to a `conftest.py` or a `tests/python/_cli_helpers.py` so modules stay self-contained.
- Pure test-file refactor: no source code touched; behavior-preserving by construction.

# Acceptance criteria
- AC1: `test_logics_manager_cli.py` is split into per-domain modules; each module groups one coherent domain and stays well under the original size.
- AC2: `pytest tests/python/` collects and passes the same set of tests (same count, no skips introduced) before and after the split.
- AC3: Shared fixtures/helpers are deduplicated into `conftest.py` or a shared helper module rather than copied per file.
- AC4: No production source files are modified.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `tests/python/test_logics_manager_cli.py` (primary target, ~7,214 lines / 240 tests)
- `tests/python/` (destination package for the split modules + shared fixtures)

# AI Context
- Summary: Split the 7k-line test_logics_manager_cli.py into per-domain test modules, deduplicating shared fixtures, with the pytest suite passing unchanged.
- Keywords: refactor, tests, pytest, test split, conftest, viewer, flow, workshop, sync
- Use when: Improving test-file navigation and feedback time for the CLI suite.
- Skip when: A larger test reorganization is already in progress or would conflict.

# Backlog
- `item_452_split_test_logics_manager_cli_py_into_per_domain_test_modules`
