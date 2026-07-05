## task_284_orchestrate_vs_code_embedded_viewer_parity - Orchestrate VS Code embedded viewer parity
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 96
> Confidence: 88
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A: write the embedding ADR/contract and decide the minimal host model. Do not edit runtime behavior before the CSP/API/lifecycle assumptions are explicit.
- [x] 2. Slice B: add the VS Code viewer server manager with mocked lifecycle tests. This can land before any visible UI replacement.
- [x] 3. Slice C: replace the Logics panel shell with the embedded canonical viewer in read-only mode and prove `/api/items` plus core status/read surfaces load inside VS Code.
- [x] 4. Slice D: audit and enable write/action parity route by route, preserving Python viewer backend ownership and documenting disabled actions.
- [x] 5. Slice E: add focus commands and trim command palette entries to viewer lifecycle/focus affordances.
- [x] 6. Slice F: remove or fallback-gate the historical VS Code cockpit, delete dead controllers/tests, and update docs.
- [x] 7. Closeout proof: VS Code extension development host shows the same viewer shell as `logics-manager view`; parity matrix is complete; browser viewer tests still pass; VS Code lifecycle tests pass; lint/audit are green.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_526_define_the_vs_code_embedded_viewer_host_contract`
- `item_527_add_a_vs_code_managed_local_viewer_server_lifecycle`
- `item_528_render_the_canonical_viewer_inside_the_vs_code_logics_panel`
- `item_529_bring_viewer_write_actions_and_focus_workflows_to_parity_in_vs_code`
- `item_530_retire_the_historical_vs_code_cockpit_and_command_surface`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC3 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC5 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC7 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC9 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC10 -> This task. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Finish workflow executed on 2026-07-05.
- Linked backlog/request close verification passed.

# Report
- Added ADR `adr_026_embed_the_canonical_local_viewer_in_the_vs_code_panel` to settle the embed contract.
- Added a VS Code-managed viewer process manager and focused lifecycle tests.
- Replaced the normal VS Code Logics panel shell with an iframe embedding the canonical local viewer.
- Reduced contributed command palette entries to viewer lifecycle and focus commands.
- Updated VS Code, development, and README docs with the embedded-viewer model and parity matrix.
- Kept historical VS Code cockpit code fallback-gated rather than deleting every old controller in this pass; normal user flow no longer exposes it.
- Finished on 2026-07-05.
- Linked backlog item(s): `item_526_define_the_vs_code_embedded_viewer_host_contract`, `item_527_add_a_vs_code_managed_local_viewer_server_lifecycle`, `item_528_render_the_canonical_viewer_inside_the_vs_code_logics_panel`, `item_529_bring_viewer_write_actions_and_focus_workflows_to_parity_in_vs_code`, `item_530_retire_the_historical_vs_code_cockpit_and_command_surface`
- Related request(s): `req_287_make_the_vs_code_extension_host_the_same_logics_viewer_ui`

# Validation evidence
- `npm run lint` passed.
- `npm test` passed: 65 files, 721 tests.
- `npm run compile` passed.
- `npm run test:viewer-smoke` passed.
- `logics-manager lint --require-status` passed.
- `logics-manager audit --group-by-doc` passed with only expected fresh-request deferred-proof warnings before task closeout.

# AI Context
- Summary: Orchestrate VS Code embedded viewer parity
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_287_make_the_vs_code_extension_host_the_same_logics_viewer_ui`
- Product brief(s): `prod_036_vs_code_embedded_viewer_parity`
- Architecture decision(s): (none yet)
