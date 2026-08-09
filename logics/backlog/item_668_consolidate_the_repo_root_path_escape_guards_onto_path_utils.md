## item_668_consolidate_the_repo_root_path_escape_guards_onto_path_utils - Consolidate the repo-root path-escape guards onto path_utils
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
- Summary: Consolidate the repo-root path-escape guards onto path_utils
- Keywords: backlog-groom, request, consolidate the repo-root path-escape guards onto path_utils, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Consolidate the repo-root path-escape guards onto path_utils.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Four repo-root path-escape guards were implemented independently, at four different levels of strictness, with no shared code: `logics_manager/mcp.py:628` `_relative_path()` (most rigorous — rejects `..`, resolves against repo root, walks intermediate components for symlinks), `logics_manager/viewer.py:491` `_resolve_repo_doc_path()` (no symlink check, no explicit `..` rejection), `logics_manager/viewer_git.py:469` `_normalize_git_file_path()` (never resolves against the repo root at all — no final containment check), `logics_manager/viewer_project_tools.py:38` `_inside_file()` (no symlink or absolute-path check). A shared helper already exists and is unused by all four: `logics_manager/path_utils.py`'s `ensure_relative_to()` uses `Path.resolve().relative_to()`, which follows symlinks and checks containment in one call. `viewer_git.py`'s missing final containment check is the one worth a second, security-focused look.

# Scope
- In:
  - Route `mcp.py:_relative_path()`, `viewer.py:_resolve_repo_doc_path()`, `viewer_git.py:_normalize_git_file_path()`, and `viewer_project_tools.py:_inside_file()` through `path_utils.ensure_relative_to()` (or a thin wrapper of it if a call site needs a different error message/return shape).
  - Keep each call site's existing return contract (raise vs. return `None` vs. return a tuple) - this is a consolidation of the containment check, not a rewrite of each caller's error-handling shape.
  - Add a test proving the strictest existing behavior (symlink walk, `..` rejection, final containment check) now applies uniformly at all four call sites, including a case that only the strictest of the four (`mcp.py`'s) previously caught.
- Out:
  - The `mcp.py` TOOL_DEFINITIONS extraction, the `flow/__init__.py` help-text extraction, the coverage-floor fix, the lockfile regeneration, and the `assist_workflow.py` test gap - each is its own sibling backlog item.
  - Any change to what counts as "inside the repo" beyond what `path_utils.py` already implements.

# Acceptance criteria
- AC1: The four repo-root path-escape guards are consolidated onto `path_utils.ensure_relative_to()`, used by `mcp.py`, `viewer.py`, `viewer_git.py`, and `viewer_project_tools.py`, with a test proving the strictest existing behavior (symlink walk, `..` rejection, final containment check) applies uniformly everywhere.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `path_utils.py` gained `relative_to_root()` (the containment check, raising the catchable `PathEscapesRoot` rather than `ensure_relative_to()`'s `SystemExit` - unsafe to raise from a long-running MCP/viewer process) and `has_symlink_segment()` (the symlink walk). All four call sites (`mcp.py:_relative_path`, `viewer.py:_resolve_repo_doc_path`, `viewer_git.py:_normalize_git_file_path`, `viewer_project_tools.py:_inside_file`) now route through both, each converting `PathEscapesRoot` into its own existing error shape (unchanged per scope). `tests/python/test_path_utils.py`'s 9 tests passed, including one per call site reproducing the exact case only the strictest of the four previously caught (a symlink pointing back inside the repo). Full suite green (1239 pytest, 834 vitest, tsc, line-budget).

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
