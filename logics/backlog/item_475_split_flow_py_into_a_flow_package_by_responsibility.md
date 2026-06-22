## item_475_split_flow_py_into_a_flow_package_by_responsibility - Split flow.py into a flow package by responsibility
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90
> Confidence: 85
> Progress: 100
> Complexity: Medium
> Theme: Python decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- logics_manager/flow.py is 4165 lines mixing help text, listing, doc building, closeout repairs, and CLI wiring.

# Scope
- In:
  - Extract all _build_*_help functions into flow/help.py as the lowest-risk first move (~530 lines)
  - Split listing, PlannedDoc/native-doc builders, closeout/repair, and argparse wiring into flow/ submodules
  - Keep logics_manager/flow.py (or flow/__init__.py) as a thin facade re-exporting the existing public API
- Out:
  - Changing CLI flags, command names, or output formats
  - Other Python modules

# Acceptance criteria
- AC1: flow becomes a package whose modules each target under 500 lines.
- AC2: Public imports of logics_manager.flow continue to resolve unchanged.
- AC3: tests/python/test_cli_main.py and flow-related tests pass unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: flow becomes a package whose modules each target under 500 lines.
- request-AC2 -> This backlog slice. Proof: AC2: Public imports of logics_manager.flow continue to resolve unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: tests/python/test_cli_main.py and flow-related tests pass unchanged.
- request-AC4 -> This backlog slice. Evidence needed: clients/viewer/browser-host.js is rewritten as ES modules bundled by the existing esbuild toolchain, and sync-viewer-assets.mjs still emits the shipped viewer_assets artifact.
- request-AC5 -> This backlog slice. Evidence needed: The webview scripts renderBoardApp.js and mainApp.js are modularized and bundled with no behavior change.
- request-AC6 -> This backlog slice. Evidence needed: No new framework or runtime dependency is introduced; only existing tooling (Python packages, esbuild, vitest) is used.
- request-AC7 -> This backlog slice. Evidence needed: A guardrail (lint check or test) fails when a new source file exceeds the agreed line budget, preventing regressions.
- request-AC8 -> This backlog slice. Evidence needed: logics-manager lint and audit pass on the resulting workflow corpus and code.
- request-AC4 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
- request-AC5 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
- request-AC6 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
- request-AC7 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
- request-AC8 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Primary task(s): `task_267_orchestrate_the_oversized_source_modularization_program`

# AI Context
- Summary: Split flow.py into a flow package by responsibility
- Keywords: scaffolded-backlog, split flow.py into a flow package by responsibility, implementation-ready
- Use when: Implementing the scaffolded slice for Split flow.py into a flow package by responsibility.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Validation
- Split logics_manager/flow.py into the logics_manager.flow package with responsibility-scoped chunks under 500 lines while preserving public imports and monkeypatchable globals. Validation: python3 -m pytest tests/python/test_flow_cli.py tests/python/test_cli_main.py -q and npm run check:line-budget pass.

# Tasks
- `task_267_orchestrate_the_oversized_source_modularization_program`

# Notes
- Task `task_267_orchestrate_the_oversized_source_modularization_program` was finished via `logics-manager flow finish task` on 2026-06-22.
