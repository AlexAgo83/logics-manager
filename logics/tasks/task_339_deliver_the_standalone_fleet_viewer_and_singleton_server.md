## task_339_deliver_the_standalone_fleet_viewer_and_singleton_server - Deliver the standalone fleet viewer and singleton server
> From version: 2.21.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-12 10:19:20
> Owner: Codex

# AI Context
- Summary: Execute launch/discovery, request-scoped isolation, fleet UI, and singleton lifecycle in that dependency order; do not migrate the registry before isolation is proven.
- Keywords: deliver, standalone, fleet, viewer, singleton, server
- Use when: Delivering the full fleet-viewer request or coordinating its four linked backlog slices.
- Skip when: Implementing an unrelated viewer enhancement with no cross-project or lifecycle impact.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Inspect the existing fleet, viewer, preferences, registry, CLI root override, and VS Code host contracts; record the exact routes that currently read mutable server project state.
- [x] 2. Implement the bounded standalone fleet launch and operator roots before UI work, with focused tests for discovery and CLI compatibility.
- [x] 3. Make project context explicit and request-scoped across viewer routes; prove two independent clients cannot affect each other and preserve all authorization boundaries.
- [x] 4. Add the fleet home UI and lazy aggregate signals using existing report payloads, then build viewer assets through the existing pipeline.
- [x] 5. Migrate the locked viewer registry and VS Code launcher to one fleet server, validate stale reuse and targeted focus, update docs, run the viewer smoke and repository checks, then close out with evidence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`
- `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`
- `item_707_build_the_fleet_home_and_project_navigation_surface`
- `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: `test_real_cli_fleet_from_plain_directory_opens_home` covers `view --fleet` from a plain directory without a project query; implemented in f10cddc.
- request-AC2 -> This task. Proof: `test_adding_a_fleet_root_discovers_only_its_immediate_projects` and `test_a_fleet_root_lists_bootstrappable_projects` cover operator roots, one-level discovery, and bootstrappable projects; implemented in f10cddc.
- request-AC3 -> This task. Proof: the Fleet screen renders project cards with details-path disclosure, Logics availability, lazy `/api/projects-state` signals, and inline unreadable-project errors; implemented in f10cddc.
- request-AC4 -> This task. Proof: `test_project_context_is_per_request_not_shared` proves independent project requests do not mutate shared server state; implemented in d56442d and f10cddc.
- request-AC5 -> This task. Proof: `test_fleet_projects_are_shared_across_the_singleton_claim` and `test_two_real_cli_processes_for_the_same_repo_share_one_server` cover the shared registry and live reuse; implemented in d56442d and f10cddc.
- request-AC6 -> This task. Proof: VS Code launches the normal project-oriented `view` command while the CLI still builds project/focus URLs against the shared server; covered by `tests/viewerServerManager.test.ts`; implemented in f10cddc.
- request-AC7 -> This task. Proof: project ids are validated against the server allowlist, root removal only accepts stored fleet roots, and existing LAN mutating-route checks remain ahead of mutations; covered by targeted Python and browser-host tests; implemented in f10cddc.
- request-AC8 -> This task. Proof: validation passed with targeted Python viewer tests, Vitest viewer/browser-host tests, and `npm run check:viewer-host` on 2026-08-13.
- request-AC9 -> This task. Proof: `docs/cli.md`, `docs/development.md`, and `docs/vscode.md` document `view --fleet`, one-level roots, one-server lifecycle, and CDX/VS Code relationship; implemented in 4480e52.

# Validation
- (no validation recorded yet)
- command: `/opt/homebrew/bin/python3.11 -m pytest -q tests/python/test_viewer_preferences.py tests/python/test_viewer_registry.py && npm exec -- vitest tests/viewerServerManager.test.ts tests/viewer.screen-registry.test.ts tests/viewer.browser-host.test.ts && npm run check:viewer-host && logics-manager lint --require-status && logics-manager audit --group-by-doc` | result: passed | date: 2026-08-13
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`, `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`, `item_707_build_the_fleet_home_and_project_navigation_surface`, `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`
- Related request(s): `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`

# Links
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`
