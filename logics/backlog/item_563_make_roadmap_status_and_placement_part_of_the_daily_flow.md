## item_563_make_roadmap_status_and_placement_part_of_the_daily_flow - Make roadmap status and placement part of the daily flow
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Roadmap planning
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Roadmap support exists, but there is no natural command to see what is unplaced, place a ref into a milestone, or keep milestones updated during task closeout.

# Scope
- In:
  - Add `logics-manager roadmap status` or `logics-manager flow roadmap status` to list roadmap docs, milestone summaries, open high/medium refs not placed in a roadmap, and stale roadmap warnings.
  - Add `logics-manager roadmap place <ref> --roadmap <road_ref> --milestone <label>` or the equivalent under `flow roadmap` to update roadmap placement without hand-editing.
  - Make flow validate or closeout emit non-blocking roadmap recommendations when roadmap docs exist and linked work is done or unplaced.
  - Keep repositories with zero roadmap docs passing with no warning.
  - Add tests for no-roadmap, populated-roadmap, unplaced-high-priority, and place-command update paths.
- Out:
  - Drag-and-drop roadmap editing.
  - Making roadmap a release gate.
  - Requiring every open task to belong to a roadmap.

# Acceptance criteria
- AC1: A roadmap status command summarizes current roadmaps and unplaced high/medium open work.
- AC2: A place command updates roadmap placement and validates refs without manual edits.
- AC3: Closeout or validate prints recommendations when roadmap placement is stale, but does not block task finish solely for roadmap hygiene.
- AC4: Repos without roadmap docs remain quiet and pass validation.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: A roadmap status command summarizes current roadmaps and unplaced high/medium open work.
- request-AC8 -> This backlog slice. Proof: AC2: A place command updates roadmap placement and validates refs without manual edits.

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
