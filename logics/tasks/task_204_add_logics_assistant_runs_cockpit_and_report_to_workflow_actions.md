## task_204_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions - Add Logics assistant runs cockpit and report-to-workflow actions
> From version: 2.6.1
> Schema version: 1.0
> Status: Ready
> Understanding: 97%
> Confidence: 92%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_396_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`


```mermaid
%% logics-kind: task
%% logics-signature: task|add-logics-assistant-runs-cockpit-and-re|item-396-add-logics-assistant-runs-cockp|1-confirm-scope|run-python3-m-logics-manager-lint-requi
flowchart TD
    Backlog[Backlog item] --> Build[Implementation]
    Build --> Validate[Validation]
    Validate --> Close[Finish workflow]
```

# Acceptance criteria
- AC1: The CDX screen provides a `Status/Runs` switch in its header area, near the close control, without adding a separate top-level Runs action.
- AC2: The existing CDX status content remains available as the `Status` view.
- AC3: The `Runs` view lists recent and active CDX runs from a stable JSON source.
- AC4: Active and terminal run states are visually distinct and include enough metadata to understand what is running, where, and through which provider/session.
- AC5: The `Runs` view can refresh or poll run state so a run visibly moves from running to a terminal state without restarting the viewer.
- AC6: A completed run can be opened as a report with summary, structured output, artifact paths, and errors when present.
- AC7: Code-review reports render normalized findings with severity, title, file/line references when available, and recommendation text.
- AC8: Operators can draft a Logics request from code-review findings with traceability back to the CDX `run_id` and report artifact.
- AC9: Report-to-workflow actions keep an operator review boundary before writing docs by default.
- AC10: The implementation degrades clearly when CDX does not yet expose run status/report commands or when a run has only raw artifacts.
- AC11: Tests cover CDX payload mapping, Status/Runs switching, active/terminal rendering, refresh behavior, report rendering, and request draft/create behavior.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_204_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement the CDX screen Runs sub-view, Status/Runs switching, and report-to-workflow actions.
- Keywords: task, implementation, CDX screen, runs view, Status/Runs switch, report-to-workflow
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
