## task_282_orchestrate_single_sourcing_of_shared_web_assets - Orchestrate single-sourcing of shared web assets
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: digital

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A (collapse src twins): delete clients/shared-web/src, repoint line-budget/lint to media, remove build-webview-media + its npm scripts. Validate with npm run lint and the full test suites.
- [x] 2. Slice B (viewer.py fallback): resolve assets from packaged viewer_assets else clients/shared-web/media + clients/viewer; add a pytest for both branches. Independent of Slice A. (Repo-first fallback already existed since req_273/64cfb68; kept that order — packaged-first would regress dev — extracted _resolve_asset_root helper and added the missing both-branch pytest.)
- [x] 3. Slice C (generate + untrack mirror): add build:assets, git rm --cached + gitignore viewer_assets, wire build:assets into the pip build, add a CI wheel-content check. Depends on Slices A and B. (build:assets = sync media + sync viewer + copy mermaid from node_modules; ci-check.mjs regenerates assets first so lint gates stay green on a fresh checkout; publish-pypi.yml runs npm ci + build:assets before python -m build and verifies the wheel; local wheel proof: 36 media + 3 viewer + 1 vendor files shipped.)
- [x] 4. Slice D (retire tooling + docs): fold sync scripts into build:assets, drop the mirror check gates, update CONTRIBUTING and CI. Depends on Slice C. (Collapsed sync-webview-media + sync-viewer-assets + copy-vendor-assets into one scripts/build/build-assets.mjs; deleted the 4 sync/check npm aliases and removed both mirror-parity gates from lint + ci-check; removed the obsolete pre-commit drift hook and the dev-only sync in run-viewer.mjs; updated CONTRIBUTING + docs/development.md to the single-source + build:assets flow.)
- [x] 5. Closeout proof: from a clean clone, build:assets + python -m build + install serves the viewer identically; logics-manager lint/audit and the pytest + vitest suites are green; git confirms a single committed source with no byte-identical copies. (build:assets regenerates a byte-identical tree; local python -m build wheel shipped 36 media + 3 viewer + 1 vendor; vitest 700/700, pytest viewer suites green, logics lint OK; viewer_assets untracked + gitignored so no committed byte-copies remain.)
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media`
- `item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py`
- `item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror`
- `item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: delivered via item_521 (Done) — sync/check tooling folded into build:assets and removed; editing a file under clients/shared-web/media is a one-file commit with no manual sync step.
- request-AC3 -> This task. Proof: delivered via item_518 (Done) — clients/shared-web/src deleted, line-budget + lint repointed to clients/shared-web/media; `npm run lint` passes.
- request-AC5 -> This task. Proof: delivered via item_520 (Done) — `npm run build:assets` is the single build step; local `python -m build` wheel shipped 36 media + 3 viewer + 1 vendor; the VS Code extension still ships clients/* + dist/vendor (npmPackage test green).
- request-AC7 -> This task. Proof: delivered across the chain — `npm run lint`, `logics-manager lint`/`audit`, `npx vitest run` (700/700), and the pytest viewer suites all pass with no viewer/webview behavior change.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- npm run lint OK; logics-manager lint/audit clean (only deferred/mermaid warnings); npx vitest run 700/700; pytest tests/python viewer suites green; local python -m build wheel shipped 36 media + 3 viewer + 1 vendor asset files
- Finish workflow executed on 2026-06-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-27.
- Linked backlog item(s): `item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media`, `item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py`, `item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror`, `item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs`
- Related request(s): `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`

# AI Context
- Summary: Orchestrate single-sourcing of shared web assets
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
