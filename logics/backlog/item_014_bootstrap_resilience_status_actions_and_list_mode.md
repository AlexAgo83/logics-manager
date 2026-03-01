## item_014_bootstrap_resilience_status_actions_and_list_mode - Bootstrap resilience, status actions, and compact list mode
> From version: 1.3.0
> Status: In progress
> Understanding: 99%
> Confidence: 96%
> Progress: 88%
> Complexity: High
> Theme: UX and workflow resilience
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The current orchestrator UX still has workflow gaps around bootstrap recovery, item lifecycle actions, and dense board navigation. Users need a more resilient setup flow and a compact display alternative without losing current board capabilities.

# Scope
- In:
  - Bootstrap hardening when git is missing (`git init` proposal + retry flow).
  - Tools actions for `Bootstrap Logics` rerun and `About` (open GitHub page).
  - Double-click open behavior on item cells/cards.
  - Details actions to mark item as `Done` or `Obsolete`.
  - Disable `Use Workspace Root` when already using workspace root.
  - Board/list mode switch with persisted UI state.
- Out:
  - Full redesign of the board/details information architecture.
  - Bulk-edit/multi-select workflows.
  - Large-scale migration of historical docs beyond direct action updates.

# Acceptance criteria
- Bootstrap offers `git init` when needed and retries flow safely.
- Tools exposes a visible `Bootstrap Logics` rerun action.
- Double-click on an item opens the corresponding file.
- Details panel exposes `Mark as done` and `Mark as obsolete` actions with consistent indicator/status updates.
- `Use Workspace Root` is disabled when already active.
- A mode switch button (before `Refresh`) toggles Board/List compact views.
- View mode persists and keeps filters/details behavior intact.
- Harness and VS Code runtime behaviors remain context-appropriate without regressions.

# AC Traceability
- AC1 -> Bootstrap preflight in extension host (`git init` proposal + retry path).
- AC2 -> Tools menu additions + command wiring for bootstrap rerun and about action.
- AC3 -> Double-click open behavior in board/list item surfaces.
- AC4 -> Details status actions + markdown updates for done/obsolete semantics.
- AC5 -> Root control state logic and disabled UI affordance.
- AC6 -> Board/List renderer toggle and compact list separators.
- AC7 -> Persisted view mode in webview state with filter/details compatibility.
- AC8 -> Tests/manual validation in both harness and VS Code contexts.

# Priority
- Impact:
  - High: resolves bootstrap blockers and improves day-to-day navigation/workflow decisions.
- Urgency:
  - High: multiple requested UX gaps tied to primary user flows.

# Notes
- Derived from `logics/request/req_014_bootstrap_resilience_status_actions_and_list_mode.md`.

# Tasks
- `logics/tasks/task_015_orchestration_delivery_for_req_014_bootstrap_resilience_status_actions_and_list_mode.md`
