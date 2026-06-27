## item_517_recompose_git_and_ci_activity_lines_into_human_summaries - Recompose git and CI activity lines into human summaries
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Git and CI meta lines are raw concatenations (e.g. 'deploy.yml — success') with no relative time and, for git, no branch or commit context even though the host has it.

# Scope
- In:
  - Expose branch and short SHA (and run outcome/workflow) on the git/CI events in clients/viewer/src/browser-host/index.js where ciActivityEvents and activityEventsFromStoredState already have the source data
  - In getActivityEntries / renderActivityPanel, recompose the meta line into a human summary that appends a relative timestamp via toolsPanelLayout.formatActivityTimeBucket
  - Extend tests/webview.chrome.test.ts to cover the state-coloured marker, the kind glyphs, and the recomposed git/CI lines
  - Keep shared-web as the only edited webview source and re-run the media sync
- Out:
  - Adding new event kinds or changing the activity filter toggles
  - Changing document-entry line formatting

# Acceptance criteria
- AC1: CI lines read 'workflow · outcome · Nm ago' and git lines read 'action · branch @ shortsha · Nm ago' when the data is present, degrading gracefully when it is not.
- AC2: The relative timestamp reuses formatActivityTimeBucket with no new date code.
- AC3: tests/webview.chrome.test.ts covers the coloured marker, glyphs, and recomposed lines and the full vitest suite passes.
- AC4: logics-manager lint and audit pass on the workflow corpus.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: CI lines read 'workflow · outcome · Nm ago' and git lines read 'action · branch @ shortsha · Nm ago' when the data is present, degrading gracefully when it is not.
- request-AC5 -> This backlog slice. Proof: AC2: The relative timestamp reuses formatActivityTimeBucket with no new date code.
- request-AC6 -> This backlog slice. Proof: AC3: tests/webview.chrome.test.ts covers the coloured marker, glyphs, and recomposed lines and the full vitest suite passes.
- request-AC7 -> This backlog slice. Proof: AC4: logics-manager lint and audit pass on the workflow corpus.
- request-AC8 -> This backlog slice. Proof: AC4: logics-manager lint and audit pass on the workflow corpus.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_recent_activity_feed_legibility`
- Architecture decision(s): (none yet)
- Request: `req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events`
- Primary task(s): `task_281_orchestrate_the_recent_activity_feed_legibility_polish`

# AI Context
- Summary: Recompose git and CI activity lines into human summaries
- Keywords: scaffolded-backlog, recompose git and ci activity lines into human summaries, implementation-ready
- Use when: Implementing the scaffolded slice for Recompose git and CI activity lines into human summaries.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_281_orchestrate_the_recent_activity_feed_legibility_polish`

# Notes
- Task `task_281_orchestrate_the_recent_activity_feed_legibility_polish` was finished via `logics-manager flow finish task` on 2026-06-27.
