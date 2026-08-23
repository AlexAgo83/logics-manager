## item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions - Add bounded project discovery and targeting for connector sessions
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Connector onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 11:56:04

# AI Context
- Summary: Let connector clients list, identify, and target known Logics projects through bounded registry rules instead of arbitrary paths.
- Keywords: add, bounded, project, discovery, targeting, connector, sessions
- Use when: Adding `list_projects`, active-project reporting, or safe project targeting for MCP connector sessions.
- Skip when: The task only needs current-repo onboarding with no project navigation or registry lookup.

# Problem
- The dogfood transcript assumed the connector could 'go see another project', but the MCP surface does not currently provide a clear project registry/current-project/selection protocol for a model to use.

# Scope
- In:
  - Expose read-only `list_projects` and `get_active_project` MCP tools, or equivalent fields on onboarding plus a focused target argument, using the same registry/resolution source as the viewer where possible.
  - Allow `onboard_project` and project-context tools to target a known project by stable id/name/path alias without making arbitrary filesystem paths available to the model.
  - Report unavailable registry/ambiguous target/unknown project states with machine-readable errors and short human-readable messages.
  - Keep selection session-local or explicit-per-call unless an existing viewer registry already persists the active project safely.
- Out:
  - Creating new projects.
  - Editing viewer favorites or operator preferences unless existing project selection already requires it.
  - Accepting arbitrary absolute paths from remote clients.

# Acceptance criteria
- AC1: The connector can list known Logics-capable projects through a bounded payload with stable ids/names and no secret local details.
- AC2: A targeted onboarding call resolves a known project and returns that project's context.
- AC3: Ambiguous or unknown project targets fail with an explicit error listing safe candidate ids/names.
- AC4: Tests cover current-project reporting and targeted onboarding without relying on global machine state.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The connector can list known Logics-capable projects through a bounded payload with stable ids/names and no secret local details.
- request-AC8 -> This backlog slice. Proof: AC2: A targeted onboarding call resolves a known project and returns that project's context.

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
