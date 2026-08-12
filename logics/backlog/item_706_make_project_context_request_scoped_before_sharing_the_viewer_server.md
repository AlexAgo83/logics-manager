## item_706_make_project_context_request_scoped_before_sharing_the_viewer_server - Make project context request-scoped before sharing the viewer server
> From version: 2.21.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Project isolation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-12 09:08:48

# AI Context
- Summary: Remove shared mutable project selection from the server; resolve a validated project on every route so browser clients remain isolated.
- Keywords: project, context, request, scoped, before, sharing, viewer, server
- Use when: Changing viewer routes, client navigation state, project allowlisting, or LAN authorization around a selected project.
- Skip when: Styling the fleet home or changing how roots are discovered.

# Problem
- `/api/switch-project` currently changes `LogicsViewerServer.repo_root` for every client. A fleet singleton would let one tab silently change another tab's data and action target.
- Most viewer routes derive their filesystem root from that mutable server field, so the project boundary must be carried and checked at the shared route boundary rather than patched action by action.

# Scope
- In:
  - Introduce one canonical project-context resolver that maps an explicit project identifier to an allowed resolved directory and rejects unknown, missing, or escaping targets.
  - Route reads, status panels, bootstrap, document actions, and mutating endpoints through that resolver; preserve the existing local and LAN authorization checks.
  - Update browser-host state and links so independent tabs retain their own selected project and focus target.
  - Keep one-off projects selected through the existing picker explicitly allowed for that server/session without turning arbitrary browser paths into an allowlist bypass.
- Out:
  - Per-project process isolation or multiple viewer binaries.
  - Changing the workflow semantics of writes after a valid project has been selected.

# Acceptance criteria
- AC4: A project selection is carried explicitly with viewer requests and validated against the server's allowed fleet/project set. Switching projects in one client does not mutate another client's active project, and all document, Git, CDX, workflow, bootstrap, and write actions operate only on their explicitly selected project.
- AC7: LAN read-only/read-write authorization, project-root containment checks, and the bounded native/browser folder pickers remain enforced after fleet routing; no browser-provided absolute path becomes an unrestricted filesystem capability.
- AC8: Python and browser-host tests cover standalone startup, bounded root discovery, stale-server reuse, two independently selected projects, rejected project identifiers/paths, repo-root focus compatibility, and a regression proving that one tab cannot change another tab's project context.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: A project selection is carried explicitly with viewer requests and validated against the server's allowed fleet/project set. Switching projects in one client does not mutate another client's active project, and all document, Git, CDX, workflow, bootstrap, and write actions operate only on their explicitly selected project.
- request-AC7 -> This backlog slice. Proof: AC7: LAN read-only/read-write authorization, project-root containment checks, and the bounded native/browser folder pickers remain enforced after fleet routing; no browser-provided absolute path becomes an unrestricted filesystem capability.
- request-AC8 -> This backlog slice. Proof: AC8: Python and browser-host tests cover standalone startup, bounded root discovery, stale-server reuse, two independently selected projects, rejected project identifiers/paths, repo-root focus compatibility, and a regression proving that one tab cannot change another tab's project context.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): (none yet)
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Primary task(s): `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server`

# Priority
- Priority: High - a singleton server is unsafe while project selection mutates shared server state
- Rationale: Set by scaffold input or defaulted for grooming.
