## item_861_aggregate_recent_logics_and_git_activity_for_onboarding - Aggregate recent Logics and Git activity for onboarding
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Connector onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 12:58:13

# AI Context
- Summary: Add a compact recent-activity slice from Logics doc changes and existing Git viewer helpers for connector onboarding.
- Keywords: aggregate, recent, logics, git, activity, onboarding
- Use when: Surfacing branch/status counts, commits, changed Logics docs, or graceful no-Git degradation in project onboarding.
- Skip when: Building a timeline UI, CI deep dive, or persistent activity database.

# Problem
- The model needs the 'film' of the project, not just the open-work photo. Existing Git and Logics signals are split across viewer helpers and workflow docs, so connector clients do not get a compact recent-activity view.

# Scope
- In:
  - Build a small read-only recent-activity payload from existing Logics document metadata and viewer Git helpers.
  - Include branch, dirty/unpushed counts, recent commit summaries, and recently changed Logics docs when available.
  - Degrade gracefully when Git is missing, the repo has no history, or provider-specific CI/GitHub tools are unavailable.
  - Attach source pointers to each activity item: Logics ref/path for workflow activity and commit hash/path for Git activity.
  - Feed a bounded summary of this activity into `onboard_project`.
- Out:
  - A new timeline UI.
  - CI provider deep dives beyond already available viewer payloads.
  - A persistent activity database.

# Acceptance criteria
- AC1: On a Git repository, onboarding includes branch/status counts and recent commit summaries.
- AC2: On a repository without Git or without commits, onboarding includes a degraded recent-activity message and still returns Logics context.
- AC3: Recently changed Logics docs are included with refs/paths and bounded snippets or titles.
- AC4: Tests cover Git-present and Git-unavailable paths with injected runners or temporary repositories.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: On a Git repository, onboarding includes branch/status counts and recent commit summaries.
- request-AC5 -> This backlog slice. Proof: AC2: On a repository without Git or without commits, onboarding includes a degraded recent-activity message and still returns Logics context.
- request-AC8 -> This backlog slice. Proof: AC3: Recently changed Logics docs are included with refs/paths and bounded snippets or titles.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)
- Request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
- Primary task(s): `task_394_orchestrate_connector_project_onboarding_context`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_394_orchestrate_connector_project_onboarding_context`

# Notes
- Task `task_394_orchestrate_connector_project_onboarding_context` was finished via `logics-manager flow finish task` on 2026-08-23.
