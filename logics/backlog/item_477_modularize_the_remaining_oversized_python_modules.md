## item_477_modularize_the_remaining_oversized_python_modules - Modularize the remaining oversized Python modules
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
- Summary: Modularize the remaining oversized Python modules
- Keywords: scaffolded-backlog, modularize the remaining oversized python modules, implementation-ready
- Use when: Implementing the scaffolded slice for Modularize the remaining oversized Python modules.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Validation
- Split mcp.py, assist_support.py, sync.py, audit.py, and release.py into short compatibility loaders plus responsibility-scoped *_parts fragments under 500 lines, preserving public imports. Validation: python3 -m pytest tests/python/test_logics_manager_mcp.py tests/python/test_sync_cli.py tests/python/test_audit_cli.py tests/python/test_release_contract_schema.py tests/python/test_assist_cli.py tests/python/test_cli_main.py -q and npm run check:line-budget pass.

# Tasks
- `task_267_orchestrate_the_oversized_source_modularization_program`

# Notes
- Task `task_267_orchestrate_the_oversized_source_modularization_program` was finished via `logics-manager flow finish task` on 2026-06-22.
