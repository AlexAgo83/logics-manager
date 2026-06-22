## item_479_modularize_webview_scripts_renderboardapp_js_and_mainapp_js - Modularize webview scripts renderBoardApp.js and mainApp.js
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90
> Confidence: 85
> Progress: 100
> Complexity: Medium
> Theme: Frontend decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- renderBoardApp.js (1333) and mainApp.js (1005) under clients/shared-web/media exceed the budget and are duplicated into viewer_assets via the sync pipeline.

# Scope
- In:
  - Split each webview script into ES modules and bundle them with esbuild
  - Keep the shared-web -> viewer_assets sync producing identical artifacts
- Out:
  - browser-host.js (handled by a sibling slice)
  - Behavior or rendered-output changes

# Acceptance criteria
- AC1: Resulting webview source modules each target under 500 lines.
- AC2: tests/webview.board-renderer.test.ts and related webview tests pass unchanged.
- AC5: Bundled webview artifacts remain byte-stable through the sync pipeline.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Resulting webview source modules each target under 500 lines.
- request-AC2 -> This backlog slice. Proof: AC2: tests/webview.board-renderer.test.ts and related webview tests pass unchanged.
- request-AC5 -> This backlog slice. Proof: AC5: Bundled webview artifacts remain byte-stable through the sync pipeline.
- request-AC3 -> This backlog slice. Evidence needed: The Python monoliths (flow.py, viewer.py, mcp.py, assist_support.py, sync.py, audit.py, release.py) become packages organized by responsibility.
- request-AC4 -> This backlog slice. Evidence needed: clients/viewer/browser-host.js is rewritten as ES modules bundled by the existing esbuild toolchain, and sync-viewer-assets.mjs still emits the shipped viewer_assets artifact.
- request-AC6 -> This backlog slice. Evidence needed: No new framework or runtime dependency is introduced; only existing tooling (Python packages, esbuild, vitest) is used.
- request-AC7 -> This backlog slice. Evidence needed: A guardrail (lint check or test) fails when a new source file exceeds the agreed line budget, preventing regressions.
- request-AC8 -> This backlog slice. Evidence needed: logics-manager lint and audit pass on the resulting workflow corpus and code.
- request-AC3 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
- request-AC4 -> This backlog slice. Proof: Validation passed: python3 -m pytest tests/python/ -q (391 passed), npm test (680 passed), npm run lint:ts, npm run check:line-budget, npm run check:viewer-host, npm run check:webview-media, and npm run check:viewer-assets. Source: `task_267_orchestrate_the_oversized_source_modularization_program`
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
- Summary: Modularize webview scripts renderBoardApp.js and mainApp.js
- Keywords: scaffolded-backlog, modularize webview scripts renderboardapp.js and mainapp.js, implementation-ready
- Use when: Implementing the scaffolded slice for Modularize webview scripts renderBoardApp.js and mainApp.js.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Validation
- Moved mainApp.js and renderBoardApp.js sources into clients/shared-web/src fragments under 500 lines, with media artifacts regenerated by bundle:webview-media and checked by check:webview-media. Validation: npm run bundle:webview-media, npm run check:webview-media, npm test -- tests/webview*.test.ts, npm run check:viewer-assets, and npm run check:line-budget pass.

# Tasks
- `task_267_orchestrate_the_oversized_source_modularization_program`

# Notes
- Task `task_267_orchestrate_the_oversized_source_modularization_program` was finished via `logics-manager flow finish task` on 2026-06-22.
