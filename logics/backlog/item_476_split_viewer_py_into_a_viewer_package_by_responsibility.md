## item_476_split_viewer_py_into_a_viewer_package_by_responsibility - Split viewer.py into a viewer package by responsibility
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Python decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- logics_manager/viewer.py is 5800 lines covering doc parsing, item/payload assembly, project discovery, file opening, git operations, and remote-provider URL parsing.

# Scope
- In:
  - Split into viewer/ submodules: docs, items, projects, files, git, providers
  - Keep a thin viewer facade re-exporting the public payload functions used by callers
  - Preserve all payload shapes byte-for-byte
- Out:
  - Changing viewer payload schemas or viewer CLI behavior
  - browser-host.js and webview assets

# Acceptance criteria
- AC1: viewer becomes a package whose modules each target under 500 lines (git submodule up to ~700 if cohesion requires).
- AC2: tests/python/test_viewer_cli.py passes unchanged.
- AC3: Public imports of logics_manager.viewer continue to resolve unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: viewer becomes a package whose modules each target under 500 lines (git submodule up to ~700 if cohesion requires).
- request-AC2 -> This backlog slice. Proof: AC2: tests/python/test_viewer_cli.py passes unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: Public imports of logics_manager.viewer continue to resolve unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Primary task(s): `task_267_orchestrate_the_oversized_source_modularization_program`

# AI Context
- Summary: Split viewer.py into a viewer package by responsibility
- Keywords: scaffolded-backlog, split viewer.py into a viewer package by responsibility, implementation-ready
- Use when: Implementing the scaffolded slice for Split viewer.py into a viewer package by responsibility.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Validation
- Split logics_manager/viewer.py into a short compatibility loader plus responsibility-scoped viewer_parts fragments under 500 lines, preserving public imports and the legacy viewer.py path expected by tests. Validation: python3 -m pytest tests/python/test_viewer_cli.py -q, python3 -m pytest tests/python/test_cli_main.py -q, and npm run check:line-budget pass.
