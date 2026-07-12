## req_293_sync_backlog_progress_during_task_development_and_codify_task_checkpoints - Sync backlog progress during task development and codify task checkpoints
> From version: 2.17.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Workflow progress governance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Backlog item progress should update while linked tasks are being developed, not only when a task is finished.
- The CLI should expose a deliberate way to update task progress and recalculate linked backlog progress so assistants do not hand-edit indicators.
- Starting a task should make its parent backlog item visibly active when the item is still ready or not started.
- Generated task guidance should codify the existing ADR rule that meaningful implementation waves include documentation updates and leave the repository in a commit-ready checkpoint state.
- The checkpoint rule should guide assistants without forcing automatic commits or requiring a commit after every tiny checklist bullet.

# Context
- `flow start` currently changes only the selected source document, which means a task can be in progress while its linked backlog item still appears untouched.
- `flow finish task` already closes the task and can auto-close the parent backlog item when every linked task is done, but this end-only behavior leaves progress stale through most of the development loop.
- Manual edits to `Progress` and `Status` indicators are discouraged by the README and CLI docs, so contributors need a flow command instead of a documentation workaround.
- ADR 009 already defines the task wave governance: each meaningful wave should keep implementation and affected Logics docs aligned and should end in a commit-ready state, while actual commit creation stays under operator control.
- The requested behavior should be implemented as deterministic lifecycle plumbing and template guidance, not as a broad new project-management system.

# Acceptance criteria
- AC1: Starting a task through `logics-manager flow start <task>` updates linked backlog items from `Ready` or equivalent inactive states to `In progress`, unless the item is already `Done`, `Blocked`, or `Obsolete`.
- AC2: Starting a task gives linked active backlog items a non-zero progress floor when they otherwise have no progress signal, so the board reflects active development immediately.
- AC3: A new CLI command such as `logics-manager flow progress task <task_ref> --progress <n>%` updates the task progress through managed indicators and recalculates linked backlog item progress.
- AC4: Backlog item progress is computed deterministically from linked task states and progress values, with done tasks counting as 100%, inactive tasks as 0%, in-progress tasks without explicit progress using the configured active floor, and explicit progress clamped to 0-100%.
- AC5: `flow finish task` preserves existing auto-close behavior while recalculating the parent backlog progress/status before the final closeout state is written.
- AC6: Generated task plans and Definition of Done text include the ADR 009 checkpoint contract: each meaningful wave should update affected Logics docs and leave a commit-ready repository state, but tooling must not auto-commit and must not require commits for every micro-step.
- AC7: CLI docs, help output, and agent-facing guidance describe the progress command, the backlog propagation rule, and the checkpoint/documentation expectation.
- AC8: Tests cover task start propagation, explicit task progress updates, multi-task backlog averages, finish semantics, invalid progress input, and generated task guidance text.
- AC9: `python -m pytest tests/python/test_cli_main.py`, `logics-manager lint --require-status`, and `logics-manager audit --group-by-doc` pass for the implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_041_live_backlog_progress_and_checkpointed_task_execution`
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow/__init__.py` (`start_payload` currently marks the started source document only; `_close_doc` sets `Progress: 100%` at close; `_close_chain_for_kind` auto-closes parent backlog/request only when linked children are done)
- `tests/python/test_cli_main.py` (existing flow start, finish, closeout, and progress indicator tests provide the CLI regression surface)
- `logics/architecture/adr_009_treat_logics_task_waves_as_coherent_documented_commit_checkpoints.md` (settled architecture rule for coherent task waves, documentation updates inside each wave, and commit-ready checkpoints without automatic commits)
- `README.md` and `docs/cli.md` (document that Logics indicators such as `Status` and `Progress` should not be hand-edited and that lifecycle updates should go through `logics-manager flow ...`)
- `logics_manager/index.py`, `logics_manager/audit.py`, and viewer index consumers (progress/status metadata must remain deterministic for downstream board and detail views)

# AI Context
- Summary: Sync backlog progress during task development and codify task checkpoints
- Keywords: request-chain-scaffold, sync backlog progress during task development and codify task checkpoints, development-ready
- Use when: You need to implement or review the scaffolded workflow for Sync backlog progress during task development and codify task checkpoints.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_540_propagate_task_progress_to_linked_backlog_items_during_development`
- `item_541_codify_task_wave_checkpoints_and_documentation_updates_in_generated_workflows`
