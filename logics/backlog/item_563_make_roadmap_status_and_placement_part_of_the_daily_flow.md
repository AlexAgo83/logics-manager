## item_563_make_roadmap_status_and_placement_part_of_the_daily_flow - Make roadmap status and placement part of the daily flow
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 92
> Confidence: 88
> Progress: 100%
> Complexity: Medium
> Theme: Roadmap planning
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Roadmap support exists, but there is no natural command to see what is unplaced, place a ref into a milestone, or keep milestones updated during task closeout.

# Scope
- In:
  - Add top-level `logics-manager roadmap status` to list roadmap docs, milestone summaries, open high/medium refs not placed in a roadmap, and stale roadmap warnings.
  - Add top-level `logics-manager roadmap place <ref> --roadmap <road_ref> --milestone <label>` to update roadmap placement without hand-editing.
  - Keep `logics-manager flow roadmap status/place` as compatibility aliases when that is cheap and does not duplicate implementation logic.
  - Make flow validate or closeout emit non-blocking roadmap recommendations when roadmap docs exist and linked work is done or unplaced.
  - Keep repositories with zero roadmap docs passing with no warning.
  - Add tests for no-roadmap, populated-roadmap, unplaced-high-priority, and place-command update paths.
- Out:
  - Drag-and-drop roadmap editing.
  - Making roadmap a release gate.
  - Requiring every open task to belong to a roadmap.

# Acceptance criteria
- AC1: `logics-manager roadmap status` summarizes current roadmaps and unplaced high/medium open work.
- AC2: `logics-manager roadmap place` updates roadmap placement and validates refs without manual edits.
- AC3: Closeout or validate prints recommendations when roadmap placement is stale, but does not block task finish solely for roadmap hygiene.
- AC4: Repos without roadmap docs remain quiet and pass validation.
- AC5: `flow roadmap status/place` aliases are present or explicitly documented as omitted because the top-level command is the single supported surface.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: `logics-manager roadmap status` summarizes current roadmaps and unplaced high/medium open work.
- request-AC9 -> This backlog slice. Proof: AC3: Closeout or validate prints recommendations when roadmap placement is stale, but does not block task finish solely for roadmap hygiene.
- request-AC2 -> This backlog slice. Evidence needed: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- request-AC4 -> This backlog slice. Evidence needed: `ci:check` runs a cheap metadata-vs-subpackages packaging check, and `doctor packaging` / release validation can run a clean-wheel install check for critical CLI commands.
- request-AC5 -> This backlog slice. Evidence needed: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- request-AC6 -> This backlog slice. Evidence needed: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- request-AC7 -> This backlog slice. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC10 -> This backlog slice. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC2 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC4 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC5 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC6 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC7 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC10 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Make roadmap status and placement part of the daily flow
- Keywords: scaffolded-backlog, make roadmap status and placement part of the daily flow, implementation-ready
- Use when: Implementing the scaffolded slice for Make roadmap status and placement part of the daily flow.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_294_orchestrate_logics_operator_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-07-28.
