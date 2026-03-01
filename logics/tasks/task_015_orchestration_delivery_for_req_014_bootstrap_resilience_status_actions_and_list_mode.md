## task_015_orchestration_delivery_for_req_014_bootstrap_resilience_status_actions_and_list_mode - Orchestration delivery for req_014 bootstrap resilience, status actions, and list mode
> From version: 1.3.0
> Status: Ready
> Understanding: 97%
> Confidence: 94%
> Progress: 0%
> Complexity: High
> Theme: Bootstrap resilience and compact navigation
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_014_bootstrap_resilience_status_actions_and_list_mode.md`

This task delivers a cohesive UX/workflow package across extension host logic and webview UI:
- bootstrap recovery and explicit tools actions;
- item lifecycle actions (`Done`/`Obsolete`);
- compact list mode with persisted switch;
- safer and clearer root control behavior.

Constraint:
- preserve existing runtime parity and do not regress current board/details interactions.

# Plan
- [ ] 1. Harden bootstrap flow: if repo is not git-initialized, offer `git init` then retry bootstrap.
- [ ] 2. Add Tools actions: `Bootstrap Logics` rerun and `About` (open project GitHub page).
- [ ] 3. Ensure item double-click open behavior is consistent across board and list mode item surfaces.
- [ ] 4. Add details lifecycle actions (`Mark as done`, `Mark as obsolete`) with markdown/status update logic.
- [ ] 5. Disable `Use Workspace Root` action when workspace root is already active.
- [ ] 6. Implement Board/List display mode switch (button before `Refresh`) and compact list renderer with stage separators.
- [ ] 7. Persist display mode in webview state and verify compatibility with filters/details/collapse behaviors.
- [ ] 8. Add/extend automated tests for bootstrap preflight, action states, display mode switch, and status actions.
- [ ] 9. Validate behavior in both VS Code runtime and web harness mode.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Extension bootstrap preflight (`git init` offer + retry bootstrap).
- AC2 -> Tools menu command additions and availability logic.
- AC3 -> UI interaction handlers for double-click open parity.
- AC4 -> Details action handlers + document indicator/state mutation.
- AC5 -> Root state evaluation and disabled Tools control.
- AC6 -> View-mode toggle + list-mode renderer and stage separator UX.
- AC7 -> Persisted webview state and regression checks for existing UI states.
- AC8 -> Harness/VS Code parity validation and test evidence.

# Validation
- `npm run compile`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- Manual (VS Code): bootstrap with/without git init, tools actions, details status actions, board/list switch.
- Manual (Harness): mode switch rendering, double-click open behavior, root-action state parity.

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.

# Report
- Risks:
  - markdown mutation rules for done/obsolete could diverge from existing indicator conventions.
  - list-mode renderer may introduce regressions in selection/collapse/filter interactions.
  - command state for root/bootstrap tools may desync between UI and extension host state.
- Mitigation:
  - reuse existing indexer/indicator conventions and add focused tests.
  - keep board/list rendering behind explicit mode branch with shared selection state.
  - centralize root/bootstrap state derivation and re-render on refresh/state changes.
