## task_282_orchestrate_single_sourcing_of_shared_web_assets - Orchestrate single-sourcing of shared web assets
> From version: 2.14.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: digital

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A (collapse src twins): delete clients/shared-web/src, repoint line-budget/lint to media, remove build-webview-media + its npm scripts. Validate with npm run lint and the full test suites.
- [ ] 2. Slice B (viewer.py fallback): resolve assets from packaged viewer_assets else clients/shared-web/media + clients/viewer; add a pytest for both branches. Independent of Slice A.
- [ ] 3. Slice C (generate + untrack mirror): add build:assets, git rm --cached + gitignore viewer_assets, wire build:assets into the pip build, add a CI wheel-content check. Depends on Slices A and B.
- [ ] 4. Slice D (retire tooling + docs): fold sync scripts into build:assets, drop the mirror check gates, update CONTRIBUTING and CI. Depends on Slice C.
- [ ] 5. Closeout proof: from a clean clone, build:assets + python -m build + install serves the viewer identically; logics-manager lint/audit and the pytest + vitest suites are green; git confirms a single committed source with no byte-identical copies.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media`
- `item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py`
- `item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror`
- `item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs`

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
- Summary: Orchestrate single-sourcing of shared web assets
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
