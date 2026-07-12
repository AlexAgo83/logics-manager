## task_288_orchestrate_git_history_commit_diff_previews - Orchestrate Git history commit diff previews
> From version: 2.17.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Start by adding the backend `git_commit_diff_payload` and `/api/git-commit-diff` route, copying the safety and truncation shape from `git_diff_payload`.
- [ ] 2. Update `renderGitStatus` so History rows are accessible clickable controls and History keeps the shared detail pane visible with the new empty-state copy.
- [ ] 3. Add the frontend `loadGitCommitDiff` helper and click-handler branch, reusing `renderGitDiffPreview` and active-row styling rather than introducing a new renderer.
- [ ] 4. Add one backend pytest and one browser-host vitest that fail before the change and cover the root behavior.
- [ ] 5. Regenerate the viewer bundle and run the targeted validation commands before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_538_add_clickable_git_history_commit_diffs`

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
- Summary: Orchestrate Git history commit diff previews
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_291_preview_commit_diffs_from_git_history`
- Product brief(s): `prod_039_git_history_commit_diff_preview`
- Architecture decision(s): (none yet)
