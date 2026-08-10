## task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification - Deliver the single-runtime and silent-bootstrap simplification
> From version: 2.21.4
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 50%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 00:53:17
> Owner: claude

# AI Context
- Summary: Deliver the single-runtime and silent-bootstrap simplification
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Add the PATH-resolved CLI identity/version probe and require an exact match with the extension version before changing command routing.
- [x] 2. Route VS Code CLI-backed operations through the resolved runtime and prove unavailable/incompatible behavior remains read-only.
- [x] 3. Add the managed-only `bootstrap --refresh-managed` check/apply path; run it silently only for existing valid corpora and add preservation tests.
- [ ] 4. Remove startup remediation/prompt chaining and move deliberate repairs to Check Environment and Tools.
- [ ] 5. Remove plugin-owned global assistant publication and launch paths; retain global skills only through the explicit CLI `logics-manager skills install` flow.
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
- `python3 -m pytest tests/python -q` (1307 passed) after item_691.
- `npx vitest run` (848 passed) after item_691.
- `npm run lint` (tsc/eslint/line-budget/status-constants) clean after item_691.
- `python3 -m logics_manager lint` / `audit` clean after item_691.

# Report
- item_690 done: new `logicsRuntimeResolver.ts` (PATH-probe/cache shape mirrored from `pythonRuntime.ts`, applied to `logics-manager --version` instead of a Python interpreter) resolves one compatible installed CLI per project root, cached, invalidated on demand or on extension-version change. `runPythonWithOutput` (logicsProviderUtils.ts) now routes every one of its ~9 existing call sites through the resolver instead of the bundled `scripts/logics-manager.py`; unavailable/mismatched never falls back, it returns a clear error. `logicsEnvironment.ts`'s `workflowMutation` capability now requires a compatible resolved runtime (surfaced to Check Environment via a new `logicsRuntime` snapshot field) instead of raw Python availability. Windows npm `.cmd` shim launch handled via conditional `shell:true`.
- item_691 done: `bootstrap --refresh-managed` (Python: `bootstrap_payload(..., refresh_managed=True)`) refuses to create a new `logics/` corpus (returns `reason: "no_corpus"`, writes nothing) and otherwise reuses the exact same managed-file refresh logic normal bootstrap already had (instructions.md overwrite-if-stale, LOGICS.md managed-block merge, AGENTS.md/.gitignore idempotent lines) -- no new "managed region" concept invented. New VS Code `logicsSilentBootstrapRefresh.ts` (`refreshManagedBootstrap`) is a thin wrapper parsing that JSON payload into a typed result; not yet wired to any trigger (item_692 replaces the removed startup prompt chain with a call to it).
- item_692 not started.

# Links
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
