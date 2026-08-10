## task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification - Deliver the single-runtime and silent-bootstrap simplification
> From version: 2.21.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Deliver the single-runtime and silent-bootstrap simplification
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Establish the installed CLI identity/version probe and compatibility contract before changing command routing.
- [ ] 2. Route VS Code CLI-backed operations through the resolved runtime and prove unavailable/incompatible behavior remains read-only.
- [ ] 3. Split bootstrap check from managed-only refresh; make refresh silent only for existing valid corpora and add preservation tests.
- [ ] 4. Remove startup remediation/prompt chaining and move deliberate repairs to Check Environment and Tools.
- [ ] 5. Decide whether global assistant publication has a remaining explicit use case; delete it if not, otherwise retain it as a clearly advanced command.
- [ ] 6. Validate focused VS Code tests, TypeScript lint, Logics lint/audit, and the generated context pack before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`
- `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`
- `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof deferred to slice closeout.
- request-AC2 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof deferred to slice closeout.
- request-AC3 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof deferred to slice closeout.
- request-AC9 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof deferred to slice closeout.
- request-AC4 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof deferred to slice closeout.
- request-AC5 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof deferred to slice closeout.
- request-AC6 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof deferred to slice closeout.
- request-AC9 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof deferred to slice closeout.
- request-AC7 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof deferred to slice closeout.
- request-AC8 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof deferred to slice closeout.
- request-AC9 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
