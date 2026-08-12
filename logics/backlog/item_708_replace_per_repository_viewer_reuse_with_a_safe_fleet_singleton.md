## item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton - Replace per-repository viewer reuse with a safe fleet singleton
> From version: 2.21.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Shared server lifecycle
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-12 10:19:20

# AI Context
- Summary: Reuse the existing atomic registry and liveness proof at operator scope, then hand each caller a project-specific URL into the same live server.
- Keywords: replace, per, repository, viewer, reuse, safe, fleet, singleton
- Use when: Migrating viewer registry keys, CLI/VS Code launchers, stale-server handling, or focused URLs.
- Skip when: Extending MCP server reuse or adding a persistent OS daemon.

# Problem
- The current registry is intentionally keyed by repository root, so opening several projects starts several servers even though they all serve identical viewer assets.
- VS Code currently starts a repo-oriented viewer process. It needs a compatible path to the shared fleet server while retaining workspace-specific focus behavior.

# Scope
- In:
  - Evolve the existing locked registry and liveness probe into a single viewer-fleet claim per operator/profile, retaining atomic claim and stale-entry replacement behavior.
  - Make CLI `--fleet`, project-oriented CLI focus, and VS Code embedding claim or reuse that server and construct an explicit project/focus URL.
  - Preserve shutdown, port-collision clarity, asset serving, and LAN transport semantics for the one server.
  - Remove superseded per-repo lifecycle assumptions and update the relevant product/CLI/VS Code documentation.
- Out:
  - Sharing MCP servers or automatically terminating a live viewer owned by another client.
  - A permanent OS service; the singleton exists while launched and is reused while live.

# Acceptance criteria
- AC5: The viewer registry exposes one live standalone fleet server per operator/profile. CLI launches and VS Code embedding reuse its live URL, stale registry entries are safely replaced, and a focus or workspace target opens the intended project without spawning a second repo-bound server.
- AC6: Existing repo-oriented commands remain compatible: `logics-manager view --repo-root DIR --focus REF` targets that project in the shared viewer, and launching `view` without `--fleet` keeps the documented project-oriented behavior.
- AC8: Python and browser-host tests cover standalone startup, bounded root discovery, stale-server reuse, two independently selected projects, rejected project identifiers/paths, repo-root focus compatibility, and a regression proving that one tab cannot change another tab's project context.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: The viewer registry exposes one live standalone fleet server per operator/profile. CLI launches and VS Code embedding reuse its live URL, stale registry entries are safely replaced, and a focus or workspace target opens the intended project without spawning a second repo-bound server.
- request-AC6 -> This backlog slice. Proof: AC6: Existing repo-oriented commands remain compatible: `logics-manager view --repo-root DIR --focus REF` targets that project in the shared viewer, and launching `view` without `--fleet` keeps the documented project-oriented behavior.
- request-AC8 -> This backlog slice. Proof: AC8: Python and browser-host tests cover standalone startup, bounded root discovery, stale-server reuse, two independently selected projects, rejected project identifiers/paths, repo-root focus compatibility, and a regression proving that one tab cannot change another tab's project context.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Primary task(s): `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server`

# Priority
- Priority: High - it delivers the single distribution server and must follow request-scoped project isolation
- Rationale: Set by scaffold input or defaulted for grooming.
