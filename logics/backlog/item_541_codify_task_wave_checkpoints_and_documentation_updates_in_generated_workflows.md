## item_541_codify_task_wave_checkpoints_and_documentation_updates_in_generated_workflows - Codify task wave checkpoints and documentation updates in generated workflows
> From version: 2.17.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Workflow progress governance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Operators currently have to repeat that task work should be framed by meaningful commit checkpoints and documentation updates.
- ADR 009 already settles the policy, but generated task text and assistant-facing guidance do not make the rule prominent enough during development.

# Scope
- In:
  - Update generated task plan and Definition of Done wording to reference the ADR 009 wave/checkpoint contract.
  - State that each meaningful implementation wave should update affected Logics docs in the same wave.
  - State that completed waves should leave the repository in a commit-ready checkpoint state while preserving explicit operator control over actual commits.
  - Keep the guidance checkpoint-oriented rather than requiring commits after every micro-step.
  - Update CLI/docs/agent guidance where task lifecycle instructions are generated or documented.
  - Add tests that generated tasks include the checkpoint and documentation-update expectations.
- Out:
  - Adding automatic Git commit creation.
  - Introducing a mandatory branch or commit-message convention.
  - Creating a new ADR unless ADR 009 is materially changed.
  - Turning warning-level governance into a blocking audit rule in this implementation slice.

# Acceptance criteria
- AC1: Newly generated tasks include concise guidance that links implementation waves, affected Logics docs, and commit-ready checkpoints.
- AC2: The wording explicitly avoids requiring commits for every micro-step and does not imply that tooling will auto-commit.
- AC3: The guidance is present in the task template or generation path used by normal `flow` task creation.
- AC4: Agent-facing CLI docs mention the checkpoint contract once in the task lifecycle section.
- AC5: Tests guard the generated text so the policy does not silently disappear.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Newly generated tasks include concise guidance that links implementation waves, affected Logics docs, and commit-ready checkpoints.
- request-AC7 -> This backlog slice. Proof: AC2: The wording explicitly avoids requiring commits for every micro-step and does not imply that tooling will auto-commit.
- request-AC8 -> This backlog slice. Proof: AC3: The guidance is present in the task template or generation path used by normal `flow` task creation.
- request-AC9 -> This backlog slice. Proof: AC4: Agent-facing CLI docs mention the checkpoint contract once in the task lifecycle section.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_041_live_backlog_progress_and_checkpointed_task_execution`
- Architecture decision(s): (none yet)
- Request: `req_293_sync_backlog_progress_during_task_development_and_codify_task_checkpoints`
- Primary task(s): `task_290_orchestrate_live_backlog_progress_and_checkpointed_task_guidance`

# AI Context
- Summary: Codify task wave checkpoints and documentation updates in generated workflows
- Keywords: scaffolded-backlog, codify task wave checkpoints and documentation updates in generated workflows, implementation-ready
- Use when: Implementing the scaffolded slice for Codify task wave checkpoints and documentation updates in generated workflows.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
