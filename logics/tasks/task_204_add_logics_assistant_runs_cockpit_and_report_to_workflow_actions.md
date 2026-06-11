## task_204_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions - Add Logics assistant runs cockpit and report-to-workflow actions
> From version: 2.6.1
> Schema version: 1.0
> Status: Done
> Understanding: 91%
> Confidence: 86%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

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
- Finish workflow executed on 2026-06-11.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-11.
- Linked backlog item(s): `item_396_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`
- Related request(s): `req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`

# AI Context
- Summary: Implement the CDX screen Runs sub-view, Status/Runs switching, and report-to-workflow actions.
- Keywords: task, implementation, CDX screen, runs view, Status/Runs switch, report-to-workflow
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: planned task acceptance criterion covers: The CDX screen provides a `Status/Runs` switch in its header area, near the close control, without adding a separate top-level Runs action.
- request-AC2 -> This task. Proof: planned task acceptance criterion covers: The existing CDX status content remains available as the `Status` view.
- request-AC3 -> This task. Proof: planned task acceptance criterion covers: The `Runs` view lists recent and active CDX runs from a stable JSON source.
- request-AC4 -> This task. Proof: planned task acceptance criterion covers: Active and terminal run states are visually distinct and include enough metadata to understand what is running, where, and through which provider/session.
- request-AC5 -> This task. Proof: planned task acceptance criterion covers: The `Runs` view can refresh or poll run state so a run visibly moves from running to a terminal state without restarting the viewer.
- request-AC6 -> This task. Proof: planned task acceptance criterion covers: A completed run can be opened as a report with summary, structured output, artifact paths, and errors when present.
- request-AC7 -> This task. Proof: planned task acceptance criterion covers: Code-review reports render normalized findings with severity, title, file/line references when available, and recommendation text.
- request-AC8 -> This task. Proof: planned task acceptance criterion covers: Operators can draft a Logics request from code-review findings with traceability back to the CDX `run_id` and report artifact.
- request-AC9 -> This task. Proof: planned task acceptance criterion covers: Report-to-workflow actions keep an operator review boundary before writing docs by default.
- request-AC10 -> This task. Proof: planned task acceptance criterion covers: The implementation degrades clearly when CDX does not yet expose run status/report commands or when a run has only raw artifacts.
- request-AC11 -> This task. Proof: planned task acceptance criterion covers: Tests cover CDX payload mapping, Status/Runs switching, active/terminal rendering, refresh behavior, report rendering, and request draft/create behavior.
