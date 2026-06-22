## item_477_modularize_the_remaining_oversized_python_modules - Modularize the remaining oversized Python modules
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Python decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- mcp.py (1601), assist_support.py (1496), sync.py (1468), audit.py (1089), and release.py (1020) each exceed the budget.

# Scope
- In:
  - Decompose each module into cohesive submodules or a package with a re-export facade
  - Target under 500 lines per resulting module
- Out:
  - flow.py and viewer.py (handled by sibling slices)
  - Behavior or public API changes

# Acceptance criteria
- AC1: Each listed module is split so resulting files target under 500 lines.
- AC2: Public imports for each module continue to resolve unchanged.
- AC3: The relevant pytest suites pass unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each listed module is split so resulting files target under 500 lines.
- request-AC2 -> This backlog slice. Proof: AC2: Public imports for each module continue to resolve unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: The relevant pytest suites pass unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Primary task(s): `task_267_orchestrate_the_oversized_source_modularization_program`

# AI Context
- Summary: Modularize the remaining oversized Python modules
- Keywords: scaffolded-backlog, modularize the remaining oversized python modules, implementation-ready
- Use when: Implementing the scaffolded slice for Modularize the remaining oversized Python modules.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Validation
- Split mcp.py, assist_support.py, sync.py, audit.py, and release.py into short compatibility loaders plus responsibility-scoped *_parts fragments under 500 lines, preserving public imports. Validation: python3 -m pytest tests/python/test_logics_manager_mcp.py tests/python/test_sync_cli.py tests/python/test_audit_cli.py tests/python/test_release_contract_schema.py tests/python/test_assist_cli.py tests/python/test_cli_main.py -q and npm run check:line-budget pass.
