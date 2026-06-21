## req_230_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions - Add Logics assistant runs cockpit and report-to-workflow actions
> From version: 2.6.1
> Schema version: 1.0
> Status: Done
> Understanding: 97%
> Confidence: 92%
> Complexity: High
> Theme: Assistant orchestration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Maintenance edit: Normalize stale workflow reference paths.

# Needs
- Logics should expose assistant run execution inside the CDX viewer surface, not as invisible background activity or a detached top-level cockpit.
- Operators need a `Runs` sub-view within the CDX screen that shows what assistant runs are in progress, what finished, what failed, and where the resulting report/artifacts are.
- Structured CDX reports, especially code-review findings, should be convertible into Logics workflow docs so follow-up work can be tracked as requests, backlog items, and tasks.

# Context
- CDX is the right owner for provider execution, process lifecycle, session/provider selection, run artifacts, and normalized report JSON.
- Logics is the right owner for workflow visibility and conversion of assistant output into durable request/backlog/task records.
- The paired CDX request will add a headless run registry and structured task reports that Logics can consume through CLI JSON surfaces.
- Today the Logics viewer has a CDX status screen for runtime, sessions, providers, readiness/quota, and safe commands, but not a sibling `Runs` view inside that same CDX screen.
- The desired end state is an operator flow where a code-review run can be launched or observed, then its findings can seed a request such as "Address code review findings" with linked follow-up work.

# Scope
- In: transform the existing CDX screen into a switchable CDX surface with `Status` and `Runs` views.
- In: place the `Status/Runs` switch in the CDX screen header area, near the close control, so it changes the content of the CDX panel rather than adding a new topbar action.
- In: keep the current CDX status content as the `Status` view.
- In: add a `Runs` view backed by CDX run status/report JSON.
- In: show recent and active runs with status, kind, provider/session, cwd/repository, started/ended timestamps, duration, exit code, summary, and artifact links.
- In: distinguish active, succeeded, failed, timed out, cancelled, and stale runs with clear scan-friendly states.
- In: poll or refresh CDX run state without requiring page navigation.
- In: open a completed run report, including code-review findings when present.
- In: provide report-to-workflow actions that draft or create Logics requests/backlog/tasks from structured report findings.
- In: keep generated workflow docs reviewable and traceable back to the CDX `run_id`, report path, and source repository.
- In: preserve a bounded manual-review step before creating or mutating workflow docs unless an explicit execution mode says otherwise.
- Out: implementing CDX process lifecycle, run registry storage, or provider execution.
- Out: adding a separate top-level `Runs` button beside Git, CI, CDX, or Settings in the first version.
- Out: parsing raw provider transcripts as the primary integration path.
- Out: making every assistant output automatically actionable; unsupported report types can remain display-only.


```mermaid
%% logics-kind: request
%% logics-signature: request|add-logics-assistant-runs-cockpit-and-re|logics-should-expose-assistant-run-execu|ac1-the-cdx-screen-provides-a
flowchart TD
    Need[Run visibility] --> CDX[CDX screen]
    CDX --> Status[Status view]
    CDX --> Runs[Runs view]
    Runs --> Report[Run report view]
    Report --> Findings[Structured findings]
    Findings --> Workflow[Request backlog task actions]
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

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Dependencies and risks
- Depends on CDX exposing a stable run registry/status/report JSON contract.
- The UI should avoid coupling to CDX internal filesystem layouts; it should consume CLI/API payloads.
- Report-to-workflow generation must preserve operator control so assistant findings do not silently mutate workflow docs.
- Code-review findings may be incomplete or lack line numbers, so the workflow action needs graceful handling for partial evidence.
- Cross-repo traceability needs clear source fields because CDX may execute against repositories outside the Logics viewer repo.
- The CDX panel header needs enough room for the switch and close control without crowding narrow viewports.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer_assets/viewer/browser-host.js`
- `logics_manager/viewer_assets/viewer/index.html`
- `logics_manager/viewer_assets/viewer/viewer.css`
- `logics_manager/viewer.py`
- `logics_manager/flow.py`
- Paired CDX request in `cdx-manager`: req_005_add_observable_assistant_run_registry_and_structured_task_reports

# AI Context
- Summary: Add a Runs sub-view to the existing CDX screen, switched from the CDX header next to Status, to consume CDX run status/report JSON and turn structured reports into reviewable workflow docs.
- Keywords: assistant runs, CDX status, CDX Runs view, Status/Runs switch, code review findings, report-to-workflow, request generation, viewer
- Use when: Designing or implementing the CDX screen's Status/Runs switch, CDX run observation UI, or report-to-workflow actions.
- Skip when: Work is only about CDX provider execution or run registry persistence.

# Backlog
- none
- `item_396_add_logics_assistant_runs_cockpit_and_report_to_workflow_actions`
