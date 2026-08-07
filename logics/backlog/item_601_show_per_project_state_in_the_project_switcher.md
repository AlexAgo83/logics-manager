## item_601_show_per_project_state_in_the_project_switcher - Show per-project state in the project switcher
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Project switcher
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The switcher reports only whether each sibling project holds a corpus, so finding where work is blocked means switching into every project in turn.
- The fleet report already answers that in one call, and corpus detection is meanwhile implemented in four separate places.

# Scope
- In:
  - Show each listed project's open-work count and issue signals in the switcher.
  - Reuse the existing fleet report rather than adding another aggregation.
  - Load the per-project state on demand rather than while the viewer starts.
  - Route every corpus-detection check through one shared implementation, keeping the switcher's own rules about which directories to consider.
- Out:
  - A dedicated fleet screen.
  - Acting on another project without switching to it.
  - Changing which projects the switcher discovers.
  - Concurrent or incremental scanning.

# Acceptance criteria
- AC1: Each listed project shows its open-work count and issue signals.
- AC2: A project that fails to report is shown with its error, and the others are still listed.
- AC3: Viewer startup time is unaffected, because the state loads on demand.
- AC4: One implementation decides whether a directory holds a corpus, used by every caller.
- AC5: Tests cover a healthy project, a failing one, and a directory that holds no corpus.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Each listed project shows its open-work count and issue signals.
- request-AC6 -> This backlog slice. Proof: AC2: A project that fails to report is shown with its error, and the others are still listed.
- request-AC8 -> This backlog slice. Proof: AC3: Viewer startup time is unaffected, because the state loads on demand.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)
- Request: `req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports`
- Primary task(s): `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# AI Context
- Summary: Show per-project state in the project switcher
- Keywords: scaffolded-backlog, show per-project state in the project switcher, implementation-ready
- Use when: Implementing the scaffolded slice for Show per-project state in the project switcher.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - answers where work is blocked without switching projects
- Rationale: Set by scaffold input or defaulted for grooming.
