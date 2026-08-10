## task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification - Deliver the single-runtime and silent-bootstrap simplification
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 01:46:19
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
- [x] 4. Remove startup remediation/prompt chaining and move deliberate repairs to Check Environment and Tools.
- [x] 5. Deferred as a separable follow-up during implementation (see item_692's trimmed scope): explicit, user-triggered Tools-menu global Codex/Claude publication and launch commands are unchanged. Only their automatic startup triggering was removed in step 4.
- [x] 6. Validate focused VS Code tests, TypeScript lint, Logics lint/audit, and the generated context pack before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`
- `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`
- `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof: implemented in acfc03af (logicsRuntimeResolver.ts resolves+caches one compatible CLI per project root); validated by tests/logicsRuntimeResolver.test.ts.
- request-AC2 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof: implemented in acfc03af (runPythonWithOutput routes through the resolver, no bundled-script fallback on missing/mismatched); validated by tests/logicsRuntimeResolver.test.ts and logicsProviderUtils.more.test.ts.
- request-AC3 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof: implemented in acfc03af (workflowMutation capability requires a compatible resolved runtime, surfaced via the new logicsRuntime snapshot field); validated by logicsEnvironment.test.ts.
- request-AC9 -> `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`. Proof: validated by tests/logicsRuntimeResolver.test.ts (npm/pip launch forms via conditional shell:true, cache invalidation, version-change re-resolution).
- request-AC4 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof: implemented in 13570c77 (`bootstrap --refresh-managed` reuses the existing managed-file refresh logic); validated by tests/python/test_bootstrap_refresh_managed.py.
- request-AC5 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof: implemented in 13570c77 (refuses to create a new corpus, never touches Git); validated by tests/python/test_bootstrap_refresh_managed.py.
- request-AC6 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof: implemented in 13570c77 (no-corpus path writes nothing, explicit `bootstrap` remains the init command); validated by tests/python/test_bootstrap_refresh_managed.py.
- request-AC9 -> `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`. Proof: validated by tests/python/test_bootstrap_refresh_managed.py (preservation of user content outside the managed block, no-op when nothing stale).
- request-AC7 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof: implemented in 2a995dd5 (deleted maybeOfferStartupKitUpdate/maybeOfferCodexStartupRemediation and their automatic startup call sites; explicit Tools-menu commands intentionally kept, see item_692's trimmed scope); validated by tests/logicsViewProvider-kit-update-and-migration.test.ts.
- request-AC8 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof: implemented in 2a995dd5 (startup now calls maybeSilentlyRefreshManagedBootstrap; shouldRecommendCheckEnvironment remains the one passive status path); validated by tests/logicsViewProvider-kit-update-and-migration.test.ts.
- request-AC9 -> `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`. Proof: validated by `npx vitest run` (844 passed) across acfc03af/13570c77/2a995dd5.

# Validation
- `python3 -m pytest tests/python -q` (1307 passed) after item_691 (unaffected by item_692's TS-only changes).
- `npx vitest run` (844 passed) after item_692.
- `npm run lint` (tsc/eslint/line-budget/status-constants) clean after item_692.
- `python3 -m logics_manager lint` / `audit` clean after item_692.
- command: `npx vitest run && python3 -m pytest tests/python -q && npm run lint` | result: passed | date: 2026-08-11
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- item_690 done: new `logicsRuntimeResolver.ts` (PATH-probe/cache shape mirrored from `pythonRuntime.ts`, applied to `logics-manager --version` instead of a Python interpreter) resolves one compatible installed CLI per project root, cached, invalidated on demand or on extension-version change. `runPythonWithOutput` (logicsProviderUtils.ts) now routes every one of its ~9 existing call sites through the resolver instead of the bundled `scripts/logics-manager.py`; unavailable/mismatched never falls back, it returns a clear error. `logicsEnvironment.ts`'s `workflowMutation` capability now requires a compatible resolved runtime (surfaced to Check Environment via a new `logicsRuntime` snapshot field) instead of raw Python availability. Windows npm `.cmd` shim launch handled via conditional `shell:true`.
- item_691 done: `bootstrap --refresh-managed` (Python: `bootstrap_payload(..., refresh_managed=True)`) refuses to create a new `logics/` corpus (returns `reason: "no_corpus"`, writes nothing) and otherwise reuses the exact same managed-file refresh logic normal bootstrap already had (instructions.md overwrite-if-stale, LOGICS.md managed-block merge, AGENTS.md/.gitignore idempotent lines) -- no new "managed region" concept invented. New VS Code `logicsSilentBootstrapRefresh.ts` (`refreshManagedBootstrap`) is a thin wrapper parsing that JSON payload into a typed result.
- item_692 done: deleted `maybeOfferStartupKitUpdate` (runtime-version popup) and `maybeOfferCodexStartupRemediation` (Codex-publication popup) plus their now-dead prompt-state helpers; the startup path in `logicsViewProvider.ts` now calls `maybeSilentlyRefreshManagedBootstrap` (wired to item_691's `refreshManagedBootstrap`, logged to the existing "Logics Environment" output channel without `.show()`) for a canonical project instead. Opening a healthy project produces zero popups. Scope trimmed during implementation (see item_692/req_331-AC7): explicit, user-triggered Tools-menu global Codex/Claude publication and launch commands are unchanged -- only their automatic startup triggering is gone. Fully retiring those commands in favor of `logics-manager skills install` is a separable follow-up (touches package.json command contributions and webview UI outside this slice's tested surface).
- Finished on 2026-08-11.
- Linked backlog item(s): `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`, `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`, `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`
- Related request(s): `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`

# Links
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
