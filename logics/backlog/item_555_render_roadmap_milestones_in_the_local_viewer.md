## item_555_render_roadmap_milestones_in_the_local_viewer - Render roadmap milestones in the local viewer
> From version: 2.18.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Roadmap planning viewer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Even if roadmap docs exist, operators need to inspect milestone sequence, scope, progress, and linked refs visually while working in the viewer.

# Scope
- In:
  - Add a Roadmap screen or project tool entry in the local viewer navigation.
  - Render roadmap docs as ordered milestone lanes/cards with status, goal, scope summary, cuts, risks, validation gates, and linked refs.
  - Show a compact progress summary per milestone based on linked refs and their statuses.
  - Link roadmap refs back to existing document previews and use the existing doc-ref button behavior where possible.
  - Surface roadmap placement on existing request/backlog/task/spec/product cards and document previews when available.
  - Keep the first UI read-only except for existing document navigation actions.
  - Add focused browser-host tests and visual-state fixtures for one roadmap, multiple milestones, missing links, and no-roadmap empty state.
- Out:
  - Drag-and-drop milestone editing.
  - Inline milestone creation from the viewer.
  - A calendar/timeline date planner.

# Acceptance criteria
- AC1: The viewer has a discoverable Roadmap screen when roadmap docs exist.
- AC2: Milestones render in declared order with label, title/goal, status, linked refs, risks, and exit criteria.
- AC3: Linked refs inside milestones are clickable through existing viewer document navigation.
- AC4: Existing doc cards or details show roadmap placement such as `Roadmap: 0.1` when linked.
- AC5: Viewer tests cover populated, empty, and malformed-roadmap states without blank-screen failures.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The viewer has a discoverable Roadmap screen when roadmap docs exist.
- request-AC2 -> This backlog slice. Proof: AC2: Milestones render in declared order with label, title/goal, status, linked refs, risks, and exit criteria.
- request-AC3 -> This backlog slice. Proof: AC3: Linked refs inside milestones are clickable through existing viewer document navigation.
- request-AC6 -> This backlog slice. Proof: AC4: Existing doc cards or details show roadmap placement such as `Roadmap: 0.1` when linked.
- request-AC7 -> This backlog slice. Proof: AC5: Viewer tests cover populated, empty, and malformed-roadmap states without blank-screen failures.
- request-AC9 -> This backlog slice. Proof: AC5: Viewer tests cover populated, empty, and malformed-roadmap states without blank-screen failures.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_044_first_class_roadmap_planning`
- Architecture decision(s): (none yet)
- Request: `req_296_add_first_class_roadmap_planning_to_logics_manager`
- Primary task(s): `task_293_deliver_first_class_roadmap_planning_support`

# AI Context
- Summary: Render roadmap milestones in the local viewer
- Keywords: scaffolded-backlog, render roadmap milestones in the local viewer, implementation-ready
- Use when: Implementing the scaffolded slice for Render roadmap milestones in the local viewer.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
