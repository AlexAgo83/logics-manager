## item_707_build_the_fleet_home_and_project_navigation_surface - Build the fleet home and project navigation surface
> From version: 2.21.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Fleet navigation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-12 10:19:19

# AI Context
- Summary: Surface bounded project discovery as a first screen, with lazy existing health signals that help choose a project without creating a combined board.
- Keywords: build, fleet, home, project, navigation, surface
- Use when: Building the viewer fleet home, root-management controls, or aggregate project-status presentation.
- Skip when: Changing request-scoped security or the registry process lifecycle.

# Problem
- The existing project switcher is useful only after a repository-launch context has been chosen; it does not present a first-class fleet starting surface or manage fleet roots.
- Operators need enough aggregate state to choose the next project without opening every board, but this must not make viewer startup expensive.

# Scope
- In:
  - Add a fleet home with root management, project cards/list entries, favorites/recent state reuse, and a clear project-specific transition into the existing viewer surfaces.
  - Reuse `status_payload` and `health_payload` for lazy fleet signals, preserving an inline error for a failed project while displaying the others.
  - Show a compact path only as confirmation/debug information, and surface no-corpus projects as bootstrappable rather than broken.
  - Update the canonical viewer documentation and the CDX-facing launch guidance.
- Out:
  - A combined multi-project workflow board, global search across all source files, or fleet-wide mutation actions.
  - New visual frameworks or viewer asset pipelines; extend the existing browser host and generated-asset workflow.

# Acceptance criteria
- AC2: The fleet viewer lets an operator add and remove bounded fleet roots stored in operator-scoped preferences; discovery scans only immediate child directories, lists both Logics and bootstrappable projects, and never recursively scans the home directory or disk.
- AC3: The fleet home shows each discovered project's name, path on demand, Logics availability, and lazy-loaded open-work, issue, and stale-work signals; an unreadable project does not prevent the remaining fleet from rendering.
- AC9: CLI and viewer documentation describe the standalone fleet entry point, fleet-root discovery ceiling, one-server lifecycle, and the relationship with CDX; no separate Logics tray process is introduced.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The fleet viewer lets an operator add and remove bounded fleet roots stored in operator-scoped preferences; discovery scans only immediate child directories, lists both Logics and bootstrappable projects, and never recursively scans the home directory or disk.
- request-AC3 -> This backlog slice. Proof: AC3: The fleet home shows each discovered project's name, path on demand, Logics availability, and lazy-loaded open-work, issue, and stale-work signals; an unreadable project does not prevent the remaining fleet from rendering.
- request-AC9 -> This backlog slice. Proof: AC9: CLI and viewer documentation describe the standalone fleet entry point, fleet-root discovery ceiling, one-server lifecycle, and the relationship with CDX; no separate Logics tray process is introduced.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Primary task(s): `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server`

# Priority
- Priority: Medium - it turns the safe discovery and routing foundations into the operator workflow requested
- Rationale: Set by scaffold input or defaulted for grooming.
