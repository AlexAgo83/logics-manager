## task_339_deliver_the_standalone_fleet_viewer_and_singleton_server - Deliver the standalone fleet viewer and singleton server
> From version: 2.21.8
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
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
- [ ] 1. Inspect the existing fleet, viewer, preferences, registry, CLI root override, and VS Code host contracts; record the exact routes that currently read mutable server project state.
- [ ] 2. Implement the bounded standalone fleet launch and operator roots before UI work, with focused tests for discovery and CLI compatibility.
- [ ] 3. Make project context explicit and request-scoped across viewer routes; prove two independent clients cannot affect each other and preserve all authorization boundaries.
- [ ] 4. Add the fleet home UI and lazy aggregate signals using existing report payloads, then build viewer assets through the existing pipeline.
- [ ] 5. Migrate the locked viewer registry and VS Code launcher to one fleet server, validate stale reuse and targeted focus, update docs, run the viewer smoke and repository checks, then close out with evidence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`
- `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`
- `item_707_build_the_fleet_home_and_project_navigation_surface`
- `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`. Proof deferred to slice closeout.
- request-AC2 -> `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`. Proof deferred to slice closeout.
- request-AC6 -> `item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots`. Proof deferred to slice closeout.
- request-AC4 -> `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`. Proof deferred to slice closeout.
- request-AC7 -> `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`. Proof deferred to slice closeout.
- request-AC8 -> `item_706_make_project_context_request_scoped_before_sharing_the_viewer_server`. Proof deferred to slice closeout.
- request-AC2 -> `item_707_build_the_fleet_home_and_project_navigation_surface`. Proof deferred to slice closeout.
- request-AC3 -> `item_707_build_the_fleet_home_and_project_navigation_surface`. Proof deferred to slice closeout.
- request-AC9 -> `item_707_build_the_fleet_home_and_project_navigation_surface`. Proof deferred to slice closeout.
- request-AC5 -> `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`. Proof deferred to slice closeout.
- request-AC6 -> `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`. Proof deferred to slice closeout.
- request-AC8 -> `item_708_replace_per_repository_viewer_reuse_with_a_safe_fleet_singleton`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`
