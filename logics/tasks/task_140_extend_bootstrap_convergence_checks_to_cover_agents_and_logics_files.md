## task_140_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files - Extend bootstrap convergence checks to cover AGENTS and LOGICS files
> From version: 1.26.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Maintenance edit: normalized checklist state after delivery closure.

# Context
- Derived from backlog item `item_328_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files`.
- Source file: `logics/backlog/item_328_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files.md`.
- Related request(s): `req_179_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files`.
- Bootstrap currently creates or repairs `AGENTS.md` and `LOGICS.md`, but the broader convergence checks do not treat those files as required repo-local bootstrap artifacts.
- That means a repo can look healthy enough for bootstrap-convergence checks while still missing one of the files that teaches the assistant how to use the Logics kit.
- The check path should surface those missing files consistently so old repos can be repaired instead of silently drifting.

```mermaid
%% logics-kind: task
%% logics-signature: task|extend-bootstrap-convergence-checks-to-c|item-328-extend-bootstrap-convergence-ch|1-confirm-scope-dependencies-and-linked|run-the-relevant-automated-tests-for
stateDiagram-v2
    [*] --> ConfirmScope
    ConfirmScope --> ImplementWave
    ImplementWave --> CheckpointWave
    CheckpointWave --> CheckAI
    CheckAI --> Gate
    Gate --> FinalUpdate
    FinalUpdate --> [*]
    state ConfirmScope {
      :Confirm scope, dependencies, and linked acceptance criteria;
    }
    state ImplementWave {
      :Implement the next coherent delivery wave from backlog;
    }
    state CheckpointWave {
      :Checkpoint wave commit-ready, validate, update docs;
    }
    state CheckAI {
      :If AI runtime active, run commit-all command;
    }
    state Gate {
      :Do not close wave until tests and quality checks pass;
    }
    state FinalUpdate {
      :Update related Logics docs;
    }
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria.
- [x] 2. Implement the next coherent delivery wave from the backlog item.
- [x] 3. Checkpoint the wave in a commit-ready state, validate it, and update the linked Logics docs.
- [x] CHECKPOINT: leave the current wave commit-ready and update the linked Logics docs before continuing.
- [x] CHECKPOINT: if the shared AI runtime is active and healthy, run `python logics/skills/logics.py flow assist commit-all` for the current step, item, or wave commit checkpoint.
- [x] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.
- [x] FINAL: Update related Logics docs

# Delivery checkpoints
- Each completed wave should leave the repository in a coherent, commit-ready state.
- Update the linked Logics docs during the wave that changes the behavior, not only at final closure.
- Prefer a reviewed commit checkpoint at the end of each meaningful wave instead of accumulating several undocumented partial states.
- If the shared AI runtime is active and healthy, use `python logics/skills/logics.py flow assist commit-all` to prepare the commit checkpoint for each meaningful step, item, or wave.
- Do not mark a wave or step complete until the relevant automated tests and quality checks have been run successfully.

# AC Traceability
- AC1 -> Scope: `bootstrap --check` reports missing `AGENTS.md` and `LOGICS.md` when either file is absent.. Proof: capture validation evidence in this doc.
- AC2 -> Scope: The bootstrap convergence inspection used by the plugin includes `AGENTS.md` and `LOGICS.md` in its missing-path output.. Proof: capture validation evidence in this doc.
- AC3 -> Scope: The user-facing status or prompt makes it clear that the repo is only partially converged until those files exist.. Proof: capture validation evidence in this doc.
- AC4 -> Scope: The new check remains idempotent and does not rewrite files that are already correct.. Proof: capture validation evidence in this doc.
- AC5 -> Scope: Tests cover both the missing-file case and the already-converged case.. Proof: capture validation evidence in this doc.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Consider
- Architecture signals: data model and persistence
- Architecture follow-up: Review whether an architecture decision is needed before implementation becomes harder to reverse.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Derived from `item_328_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files`
- Request(s): `req_179_extend_bootstrap_convergence_checks_to_cover_agents_and_logics_files`

# AI Context
- Summary: Bootstrap currently creates or repairs AGENTS.md and LOGICS.md, but the broader convergence checks do not treat those files...
- Keywords: extend, bootstrap, convergence, checks, cover, agents, and, logics
- Use when: Use when implementing or reviewing the delivery slice for Extend bootstrap convergence checks to cover AGENTS and LOGICS files.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.
# Validation
- Run the relevant automated tests for the changed surface before closing the current wave or step.
- Run the relevant lint or quality checks before closing the current wave or step.
- Confirm the completed wave leaves the repository in a commit-ready state.

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] No wave or step was closed before the relevant automated tests and quality checks passed.
- [x] Linked request/backlog/task docs updated during completed waves and at closure.
- [x] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [x] Status is `Done` and progress is `100%`.

# Report
- Extended bootstrap convergence checks to include `AGENTS.md` and `LOGICS.md` as required repo-local bootstrap artifacts.
- Validation: `npm test -- tests/logicsProviderUtils.test.ts`, `npm run lint:ts`.
