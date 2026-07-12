## task_290_orchestrate_live_backlog_progress_and_checkpointed_task_guidance - Orchestrate live backlog progress and checkpointed task guidance
> From version: 2.17.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Map the existing task-to-backlog link discovery paths used by finish/closeout and choose the smallest shared helper for progress propagation.
- [x] 2. Implement task start propagation and the explicit `flow progress task` command with atomic validation before writes.
- [x] 3. Reuse the same propagation helper from `flow finish task` so closeout and mid-development updates stay consistent.
- [x] 4. Update generated task guidance and CLI docs to express the ADR 009 wave, documentation-update, and commit-ready checkpoint contract.
- [x] 5. Add focused tests for the lifecycle propagation rules and generated guidance text.
- [x] 6. Run targeted Python tests plus Logics lint/audit before closing the implementation task.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_540_propagate_task_progress_to_linked_backlog_items_during_development`
- `item_541_codify_task_wave_checkpoints_and_documentation_updates_in_generated_workflows`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Implemented in commit cbe34127; validated with python -m pytest tests/python/test_cli_main.py, lint, and audit. Source: `cbe34127`
- request-AC3 -> This task. Proof: Implemented in commit cbe34127; validated with python -m pytest tests/python/test_cli_main.py, lint, and audit. Source: `cbe34127`
- request-AC5 -> This task. Proof: Implemented in commit cbe34127; validated with python -m pytest tests/python/test_cli_main.py, lint, and audit. Source: `cbe34127`
- request-AC7 -> This task. Proof: Implemented in commit cbe34127; validated with python -m pytest tests/python/test_cli_main.py, lint, and audit. Source: `cbe34127`
- request-AC9 -> This task. Proof: Implemented in commit cbe34127; validated with python -m pytest tests/python/test_cli_main.py, lint, and audit. Source: `cbe34127`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- command: `python -m pytest tests/python/test_cli_main.py` | result: passed | date: 2026-07-12 | note: 180 passed; lint and audit passed with only deferred traceability warnings for unrelated fresh requests
- Finish workflow executed on 2026-07-12.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-12.
- Linked backlog item(s): `item_540_propagate_task_progress_to_linked_backlog_items_during_development`, `item_541_codify_task_wave_checkpoints_and_documentation_updates_in_generated_workflows`
- Related request(s): `req_293_sync_backlog_progress_during_task_development_and_codify_task_checkpoints`

# AI Context
- Summary: Orchestrate live backlog progress and checkpointed task guidance
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_293_sync_backlog_progress_during_task_development_and_codify_task_checkpoints`
- Product brief(s): `prod_041_live_backlog_progress_and_checkpointed_task_execution`
- Architecture decision(s): (none yet)
