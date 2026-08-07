## item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module - Move the session cockpit and workshop routes out of the viewer module
> From version: 2.19.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Module boundaries
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer module is around six thousand lines, and the majority of its routes belong to two subsystems that are not the viewer: the session cockpit and the workshop terminal.
- Its request handler alone is nearly five hundred lines, which is past what a reviewer can hold while checking an authorization or read-only rule.

# Scope
- In:
  - Extract the session cockpit routes and the workshop routes into their own modules, following the pattern the existing project-tools module already demonstrates.
  - Keep every route path, response shape, and status code identical.
  - Keep the read-only, mutating-route, and network-exposure rules attached to the routes as they move.
  - Do the extraction only after the linter and the model-consistency detector are in place.
- Out:
  - Changing any route's behavior, path, or payload.
  - Redesigning either subsystem.
  - Splitting the remaining viewer routes.
  - Changing the client at all.

# Acceptance criteria
- AC1: Every extracted route keeps its path, response shape, and status code.
- AC2: The read-only and mutating-route classifications still apply to the moved routes.
- AC3: Network-exposure restrictions behave identically before and after.
- AC4: The existing test suites pass with no test changed for reasons other than an import path.
- AC5: The viewer module is materially smaller and its request handler is reviewable.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Every extracted route keeps its path, response shape, and status code.
- request-AC8 -> This backlog slice. Proof: AC2: The read-only and mutating-route classifications still apply to the moved routes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Primary task(s): `task_303_orchestrate_the_repository_review_remediation`

# AI Context
- Summary: Move the session cockpit and workshop routes out of the viewer module
- Keywords: scaffolded-backlog, move the session cockpit and workshop routes out of the viewer module, implementation-ready
- Use when: Implementing the scaffolded slice for Move the session cockpit and workshop routes out of the viewer module.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the largest module, and the only real refactor here
- Rationale: Set by scaffold input or defaulted for grooming.
