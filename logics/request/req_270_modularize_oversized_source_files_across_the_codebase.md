## req_270_modularize_oversized_source_files_across_the_codebase - Modularize oversized source files across the codebase
> From version: 2.12.7
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Codebase maintainability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Every real source file currently over 1000 lines is decomposed into cohesive, single-responsibility modules without changing runtime behavior.
- Maintainers can locate and edit a concern in a small focused file instead of scrolling a multi-thousand-line monolith.
- The decomposition reuses tooling already in the repo (Python packages, esbuild, vitest) rather than introducing a new framework or runtime dependency.

# Context
- Audit of source line counts (excluding generated dist/build/out and vendored/minified assets) identified ten files over 1000 lines.
- `clients/viewer/browser-host.js` is the source; `logics_manager/viewer_assets/viewer/browser-host.js` is a SHA-verified copy produced by scripts/dev/sync-viewer-assets.mjs, so it is a build artifact, not a second source to refactor.
- browser-host.js is a single IIFE with 439 functions and zero import/export statements, so it needs an ES-module + esbuild bundle step rather than a plain file split.
- viewer.py and flow.py are already composed of small cohesive functions grouped by theme (git ops, doc parsing, payload builders, help text, closeout repairs), so they split cleanly into packages with a thin re-export facade.
- esbuild, typescript, and vitest are already devDependencies; no new framework is needed.
- Existing suites (tests/python/*, tests/viewer.browser-host.test.ts, tests/webview.*.test.ts) provide a behavior safety net for every slice.

# Acceptance criteria
- AC1: Each real source file previously over 1000 lines is split so that resulting modules target under 500 lines each (up to ~800 only where cohesion clearly justifies it).
- AC2: Public import paths and CLI behavior are preserved via thin re-export facades; the full pytest and vitest suites pass unchanged with no behavior regressions.
- AC3: The Python monoliths (flow.py, viewer.py, mcp.py, assist_support.py, sync.py, audit.py, release.py) become packages organized by responsibility.
- AC4: clients/viewer/browser-host.js is rewritten as ES modules bundled by the existing esbuild toolchain, and sync-viewer-assets.mjs still emits the shipped viewer_assets artifact.
- AC5: The webview scripts renderBoardApp.js and mainApp.js are modularized and bundled with no behavior change.
- AC6: No new framework or runtime dependency is introduced; only existing tooling (Python packages, esbuild, vitest) is used.
- AC7: A guardrail (lint check or test) fails when a new source file exceeds the agreed line budget, preventing regressions.
- AC8: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/browser-host.js` (10152 lines, IIFE, 439 functions)
- `logics_manager/viewer.py` (5800 lines)
- `logics_manager/flow.py` (4165 lines)
- `logics_manager/mcp.py` (1601 lines)
- `logics_manager/assist_support.py` (1496 lines)
- `logics_manager/sync.py` (1468 lines)
- `clients/shared-web/media/renderBoardApp.js` (1333 lines)
- `logics_manager/audit.py` (1089 lines)
- `logics_manager/release.py` (1020 lines)
- `clients/shared-web/media/mainApp.js` (1005 lines)
- `scripts/dev/sync-viewer-assets.mjs` (asset sync pipeline)
- `package.json` (esbuild ^0.28.1, vitest, typescript already present)

# AI Context
- Summary: Modularize oversized source files across the codebase
- Keywords: request-chain-scaffold, modularize oversized source files across the codebase, development-ready
- Use when: You need to implement or review the scaffolded workflow for Modularize oversized source files across the codebase.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_474_establish_modularization_guardrails_and_viewer_esbuild_bundle_pipeline`
- `item_475_split_flow_py_into_a_flow_package_by_responsibility`
- `item_476_split_viewer_py_into_a_viewer_package_by_responsibility`
- `item_477_modularize_the_remaining_oversized_python_modules`
- `item_478_convert_browser_host_js_into_bundled_es_modules`
- `item_479_modularize_webview_scripts_renderboardapp_js_and_mainapp_js`
