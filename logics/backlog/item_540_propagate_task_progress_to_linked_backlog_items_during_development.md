## item_540_propagate_task_progress_to_linked_backlog_items_during_development - Propagate task progress to linked backlog items during development
> From version: 2.17.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Workflow progress governance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Backlog items can remain visually stale while their linked tasks are actively being implemented.
- Because manual indicator edits are discouraged, contributors do not have a clean way to record mid-development task progress and keep the parent item aligned.
- The existing closeout path updates parents only at the end, which is too late for status boards and assistant handoffs.

# Scope
- In:
  - Add a shared helper that discovers backlog items linked to a task and recalculates their status/progress from linked tasks.
  - Call the helper from `flow start` when the source is a task so parent backlog items become active immediately.
  - Add a `flow progress task` command that validates progress input, updates the task indicator, and recalculates linked backlog items.
  - Use a deterministic progress rule: done task equals 100%, inactive task equals 0%, in-progress task without explicit progress uses an active floor, and explicit values are clamped between 0% and 100%.
  - Preserve existing `flow finish task` auto-close semantics while making progress recalculation happen through the same helper.
  - Update CLI docs and help output for the new progress lifecycle path.
  - Add focused CLI tests for start propagation, progress updates, multi-task average calculation, finish behavior, and invalid input.
- Out:
  - Auto-calculating progress from code diffs, commits, timestamps, or validation runs.
  - Changing request progress behavior beyond the existing all-items-done closeout rule unless required for consistency.
  - Allowing arbitrary hand edits to managed indicator lines.
  - Changing viewer progress rendering beyond whatever it already reads from the index.

# Acceptance criteria
- AC1: Starting an in-progress task linked to a ready backlog item updates the item to `In progress` and sets progress to the active floor when it was 0%.
- AC2: `flow progress task <task> --progress 40%` updates the task progress and the linked backlog item progress without requiring manual Markdown edits.
- AC3: A backlog item linked to multiple tasks receives the rounded average of deterministic child task progress values.
- AC4: Done, blocked, and obsolete parent items are not incorrectly reopened by progress propagation.
- AC5: Finishing the last linked task still closes the backlog item through the existing closeout flow and records 100% progress.
- AC6: Invalid progress values fail with a clear CLI error and do not partially modify documents.
- AC7: CLI help and docs explain when to use `flow start`, `flow progress task`, and `flow finish task`.
- AC8: Targeted Python tests and Logics lint/audit pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Starting an in-progress task linked to a ready backlog item updates the item to `In progress` and sets progress to the active floor when it was 0%.
- request-AC2 -> This backlog slice. Proof: AC2: `flow progress task <task> --progress 40%` updates the task progress and the linked backlog item progress without requiring manual Markdown edits.
- request-AC3 -> This backlog slice. Proof: AC3: A backlog item linked to multiple tasks receives the rounded average of deterministic child task progress values.
- request-AC4 -> This backlog slice. Proof: AC4: Done, blocked, and obsolete parent items are not incorrectly reopened by progress propagation.
- request-AC5 -> This backlog slice. Proof: AC5: Finishing the last linked task still closes the backlog item through the existing closeout flow and records 100% progress.
- request-AC7 -> This backlog slice. Proof: AC6: Invalid progress values fail with a clear CLI error and do not partially modify documents.
- request-AC8 -> This backlog slice. Proof: AC7: CLI help and docs explain when to use `flow start`, `flow progress task`, and `flow finish task`.
- request-AC9 -> This backlog slice. Proof: AC8: Targeted Python tests and Logics lint/audit pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_041_live_backlog_progress_and_checkpointed_task_execution`
- Architecture decision(s): (none yet)
- Request: `req_293_sync_backlog_progress_during_task_development_and_codify_task_checkpoints`
- Primary task(s): `task_290_orchestrate_live_backlog_progress_and_checkpointed_task_guidance`

# AI Context
- Summary: Propagate task progress to linked backlog items during development
- Keywords: scaffolded-backlog, propagate task progress to linked backlog items during development, implementation-ready
- Use when: Implementing the scaffolded slice for Propagate task progress to linked backlog items during development.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
