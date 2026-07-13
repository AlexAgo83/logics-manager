## item_556_connect_roadmap_validation_to_lint_audit_and_documentation - Connect roadmap validation to lint, audit, and documentation
> From version: 2.18.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Roadmap planning governance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Roadmap docs will decay unless standard validation and documentation explain how they relate to existing workflow docs and releases.

# Scope
- In:
  - Extend lint/audit to include roadmap hygiene without blocking fresh roadmaps on implementation evidence.
  - Warn when high-priority open backlog/task work is not assigned to any roadmap milestone and at least one roadmap exists.
  - Warn when roadmap milestones claim release readiness without release evidence, while still allowing product intent milestones.
  - Document roadmap usage in README/docs/CLI help and update assistant instructions if needed.
  - Add examples for a 0.1/0.2/0.3/1.0 plan based on a large product corpus.
  - Add tests for lint/audit findings and documentation command examples.
- Out:
  - Making roadmap placement mandatory for every repository.
  - Blocking task finish solely because roadmap status is stale.
  - Replacing release evidence commands.

# Acceptance criteria
- AC1: `logics-manager lint --require-status` accepts well-formed roadmap docs and reports malformed roadmap milestones.
- AC2: `logics-manager audit --group-by-doc` includes roadmap findings grouped by roadmap doc path.
- AC3: Docs explain roadmap versus request/backlog/task versus release in concrete terms.
- AC4: Existing repos without roadmap docs continue to pass current validation unless they already have unrelated findings.
- AC5: Tests cover roadmap-aware lint/audit behavior and no-roadmap backwards compatibility.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `logics-manager lint --require-status` accepts well-formed roadmap docs and reports malformed roadmap milestones.
- request-AC8 -> This backlog slice. Proof: AC2: `logics-manager audit --group-by-doc` includes roadmap findings grouped by roadmap doc path.
- request-AC9 -> This backlog slice. Proof: AC3: Docs explain roadmap versus request/backlog/task versus release in concrete terms.
- request-AC10 -> This backlog slice. Proof: AC4: Existing repos without roadmap docs continue to pass current validation unless they already have unrelated findings.
- request-AC6 -> This backlog slice. Proof: Implemented roadmap document kind, CLI propose/show/validate, sync/search/index/audit/lint/MCP/Obsidian integration, viewer milestone rendering, docs, generated status constants, and targeted tests passing. Source: `task_293_deliver_first_class_roadmap_planning_support`
- request-AC7 -> This backlog slice. Proof: Implemented roadmap document kind, CLI propose/show/validate, sync/search/index/audit/lint/MCP/Obsidian integration, viewer milestone rendering, docs, generated status constants, and targeted tests passing. Source: `task_293_deliver_first_class_roadmap_planning_support`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)
- Request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
- Primary task(s): `task_293_deliver_first_class_roadmap_planning_support`

# AI Context
- Summary: Connect roadmap validation to lint, audit, and documentation
- Keywords: scaffolded-backlog, connect roadmap validation to lint, audit, and documentation, implementation-ready
- Use when: Implementing the scaffolded slice for Connect roadmap validation to lint, audit, and documentation.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_293_deliver_first_class_roadmap_planning_support`

# Notes
- Task `task_293_deliver_first_class_roadmap_planning_support` was finished via `logics-manager flow finish task` on 2026-07-13.
