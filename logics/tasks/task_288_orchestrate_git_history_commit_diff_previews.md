## task_288_orchestrate_git_history_commit_diff_previews - Orchestrate Git history commit diff previews
> From version: 2.17.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Start by adding the backend `git_commit_diff_payload` and `/api/git-commit-diff` route, copying the safety and truncation shape from `git_diff_payload`.
- [x] 2. Update `renderGitStatus` so History rows are accessible clickable controls and History keeps the shared detail pane visible with the new empty-state copy.
- [x] 3. Add the frontend `loadGitCommitDiff` helper and click-handler branch, reusing `renderGitDiffPreview` and active-row styling rather than introducing a new renderer.
- [x] 4. Add one backend pytest and one browser-host vitest that fail before the change and cover the root behavior.
- [x] 5. Regenerate the viewer bundle and run the targeted validation commands before closeout.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_538_add_clickable_git_history_commit_diffs`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Implemented in commit ee2c0daa; validated with pytest tests/python/test_viewer_cli.py -k git_commit_diff_payload/git_diff_payload, viewer browser-host vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `ee2c0daa`
- request-AC3 -> This task. Proof: Implemented in commit ee2c0daa; validated with pytest tests/python/test_viewer_cli.py -k git_commit_diff_payload/git_diff_payload, viewer browser-host vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `ee2c0daa`
- request-AC5 -> This task. Proof: Implemented in commit ee2c0daa; validated with pytest tests/python/test_viewer_cli.py -k git_commit_diff_payload/git_diff_payload, viewer browser-host vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `ee2c0daa`
- request-AC7 -> This task. Proof: Implemented in commit ee2c0daa; validated with pytest tests/python/test_viewer_cli.py -k git_commit_diff_payload/git_diff_payload, viewer browser-host vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `ee2c0daa`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- command: `python -m pytest tests/python/test_viewer_cli.py -k 'git_commit_diff_payload or git_diff_payload'; npm test -- tests/viewer.browser-host.test.ts -t 'Git history commit diff|local Git status|reveals Git history'; npm run lint:ts; npm run check:viewer-host` | result: passed | date: 2026-07-12 | note: Git history commit diff backend/frontend checks passed; TypeScript lint and viewer bundle check passed.
- Finish workflow executed on 2026-07-12.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-12.
- Linked backlog item(s): `item_538_add_clickable_git_history_commit_diffs`
- Related request(s): `req_291_preview_commit_diffs_from_git_history`

# AI Context
- Summary: Orchestrate Git history commit diff previews
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_291_preview_commit_diffs_from_git_history`
- Product brief(s): `prod_039_git_history_commit_diff_preview`
- Architecture decision(s): (none yet)
