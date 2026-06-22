## task_267_orchestrate_the_oversized_source_modularization_program - Orchestrate the oversized-source modularization program
> From version: 2.12.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Land the guardrails and viewer esbuild bundle pipeline first so later slices have an enabling build step and a regression budget.
- [ ] 2. Decompose flow.py, starting with the zero-risk help.py extraction, then the remaining flow submodules.
- [ ] 3. Decompose viewer.py into its package, preserving payload shapes.
- [ ] 4. Modularize the remaining Python modules (mcp, assist_support, sync, audit, release).
- [ ] 5. Convert browser-host.js into bundled ES modules and verify byte-stable artifacts.
- [ ] 6. Modularize the webview scripts (renderBoardApp, mainApp) and verify the sync pipeline.
- [ ] 7. Run lint, audit, pytest, and vitest after each slice and keep all linked docs in sync.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_474_establish_modularization_guardrails_and_viewer_esbuild_bundle_pipeline`
- `item_475_split_flow_py_into_a_flow_package_by_responsibility`
- `item_476_split_viewer_py_into_a_viewer_package_by_responsibility`
- `item_477_modularize_the_remaining_oversized_python_modules`
- `item_478_convert_browser_host_js_into_bundled_es_modules`
- `item_479_modularize_webview_scripts_renderboardapp_js_and_mainapp_js`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Orchestrate the oversized-source modularization program
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
