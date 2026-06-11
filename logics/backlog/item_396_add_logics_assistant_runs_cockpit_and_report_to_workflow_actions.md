## item_396_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions - Add Logics assistant runs cockpit and report-to-workflow actions
> From version: 2.6.1
> Schema version: 1.0
> Status: Ready
> Understanding: 97%
> Confidence: 92%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Logics should expose assistant run execution inside the CDX viewer surface, not as invisible background activity or a detached top-level cockpit.
Operators need a `Runs` sub-view within the CDX screen that shows what assistant runs are in progress, what finished, what failed, and where the resulting report/artifacts are.
Structured CDX reports, especially code-review findings, should be convertible into Logics workflow docs so follow-up work can be tracked as requests, backlog items, and tasks.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc


```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|add-logics-assistant-runs-cockpit-and-re|req-230-add-logics-assistant-runs-cockpi|logics-should-expose-assistant-run-execu|ac1-the-cdx-screen-provides-a
flowchart TD
    Request[Request source] --> Scope[Backlog scope]
    Scope --> Task[Delivery task]
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

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The CDX screen provides a `Status/Runs` switch in its header area, near the close control, without adding a separate top-level Runs action.
- request-AC2 -> This backlog slice. Proof: AC2: The existing CDX status content remains available as the `Status` view.
- request-AC3 -> This backlog slice. Proof: AC3: The `Runs` view lists recent and active CDX runs from a stable JSON source.
- request-AC4 -> This backlog slice. Proof: AC4: Active and terminal run states are visually distinct and include enough metadata to understand what is running, where, and through which provider/session.
- request-AC5 -> This backlog slice. Proof: AC5: The `Runs` view can refresh or poll run state so a run visibly moves from running to a terminal state without restarting the viewer.
- request-AC6 -> This backlog slice. Proof: AC6: A completed run can be opened as a report with summary, structured output, artifact paths, and errors when present.
- request-AC7 -> This backlog slice. Proof: AC7: Code-review reports render normalized findings with severity, title, file/line references when available, and recommendation text.
- request-AC8 -> This backlog slice. Proof: AC8: Operators can draft a Logics request from code-review findings with traceability back to the CDX `run_id` and report artifact.
- request-AC9 -> This backlog slice. Proof: AC9: Report-to-workflow actions keep an operator review boundary before writing docs by default.
- request-AC10 -> This backlog slice. Proof: AC10: The implementation degrades clearly when CDX does not yet expose run status/report commands or when a run has only raw artifacts.
- request-AC11 -> This backlog slice. Proof: AC11: Tests cover CDX payload mapping, Status/Runs switching, active/terminal rendering, refresh behavior, report rendering, and request draft/create behavior.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add a Runs sub-view to the CDX screen with Status/Runs switching and report-to-workflow actions.
- Keywords: backlog-groom, request, add logics assistant runs cockpit and report-to-workflow actions, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add Logics assistant runs cockpit and report-to-workflow actions.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions.md`.
- Generated locally by logics-manager.

# Tasks
- `task_204_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`
