## req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server - Launch a standalone Logics fleet viewer through one shared local server
> From version: 2.21.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Standalone fleet viewer
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-12 10:19:19

# AI Context
- Summary: Deliver a bounded, operator-owned fleet entry point without re-centralizing repository data; make project identity explicit at the HTTP boundary before sharing one viewer process.
- Keywords: launch, standalone, logics, fleet, viewer, through, shared, local, server
- Use when: Reworking viewer launch, project discovery, server reuse, or VS Code embedding while preserving project-local Logics corpora.
- Skip when: Adding a feature to one already-selected project that does not alter viewer lifecycle or project routing.

# Needs
- Let an operator launch Logics without first knowing or being inside a project, then navigate a bounded fleet of local projects from one viewer.
- Run one reusable local viewer server per operator instead of one server per repository, while preserving the repo-local Markdown source of truth.
- Keep every project operation explicitly scoped and validated so changing projects in one browser tab cannot redirect another tab or open arbitrary filesystem paths.
- Make the standalone viewer a natural target for the existing CDX tray launcher without adding a second Logics tray application.

# Context
- The current `fleet` CLI already discovers immediate children containing `logics/`; it deliberately has no project registry and does not recurse (`logics_manager/fleet.py`).
- The viewer already has a project switcher, project picker, on-demand cross-project status, and operator-scoped preferences. Its sibling discovery starts from the launch repository and is therefore not a standalone fleet home (`logics_manager/viewer.py`, `logics_manager/viewer_preferences.py`).
- The current viewer server holds one mutable `self.repo_root`; its project-switch endpoint changes that shared process state. This is acceptable for one active viewer but unsafe as the routing model for a single server used by multiple tabs or clients.
- The current cross-process registry deliberately provides one viewer per repository (`logics_manager/viewer_registry.py` and req_322). This request intentionally replaces that lifecycle rule for the viewer only; MCP HTTP servers remain separately scoped because their exposed-tool profile can vary.
- `--repo-root` is a global CLI contract, but the viewer currently resolves its root from the current working directory. The standalone path must make an explicit project target work consistently for CLI focus and VS Code embedding.
- Existing completed request `logics/request/req_231_add_multi_project_navigation_to_the_logics_viewer.md` delivered safe multi-project switching, and `logics/request/req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp.md` delivered a per-repo reuse registry. This request evolves those delivered foundations; it must preserve their security and stale-server guarantees rather than duplicate them.

# Acceptance criteria
- AC1: `logics-manager view --fleet --open` starts or reuses the standalone fleet viewer from any directory, including one with no repository or Logics corpus, without prompting to bootstrap the current directory.
- AC2: The fleet viewer lets an operator add and remove bounded fleet roots stored in operator-scoped preferences; discovery scans only immediate child directories, lists both Logics and bootstrappable projects, and never recursively scans the home directory or disk.
- AC3: The fleet home shows each discovered project's name, path on demand, Logics availability, and lazy-loaded open-work, issue, and stale-work signals; an unreadable project does not prevent the remaining fleet from rendering.
- AC4: A project selection is carried explicitly with viewer requests and validated against the server's allowed fleet/project set. Switching projects in one client does not mutate another client's active project, and all document, Git, CDX, workflow, bootstrap, and write actions operate only on their explicitly selected project.
- AC5: The viewer registry exposes one live standalone fleet server per operator/profile. CLI launches and VS Code embedding reuse its live URL, stale registry entries are safely replaced, and a focus or workspace target opens the intended project without spawning a second repo-bound server.
- AC6: Existing repo-oriented commands remain compatible: `logics-manager view --repo-root DIR --focus REF` targets that project in the shared viewer, and launching `view` without `--fleet` keeps the documented project-oriented behavior.
- AC7: LAN read-only/read-write authorization, project-root containment checks, and the bounded native/browser folder pickers remain enforced after fleet routing; no browser-provided absolute path becomes an unrestricted filesystem capability.
- AC8: Python and browser-host tests cover standalone startup, bounded root discovery, stale-server reuse, two independently selected projects, rejected project identifiers/paths, repo-root focus compatibility, and a regression proving that one tab cannot change another tab's project context.
- AC9: CLI and viewer documentation describe the standalone fleet entry point, fleet-root discovery ceiling, one-server lifecycle, and the relationship with CDX; no separate Logics tray process is introduced.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`

# References
- logics/request/req_231_add_multi_project_navigation_to_the_logics_viewer.md
- logics/request/req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp.md
- logics_manager/fleet.py
- logics_manager/viewer.py
- logics_manager/viewer_registry.py
- logics_manager/viewer_preferences.py

# Backlog
- `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`
- `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`
- `item_707_build_the_fleet_home_and_project_navigation_surface`
- `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`
