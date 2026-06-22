## task_270_orchestrate_the_exec_part_glue_remediation - Orchestrate the exec part-glue remediation
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 100
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Retune the line-budget guardrail first so the decomposition slices have a sane regression budget and a traceback test to land against.
- [x] 2. Reunite the numbered-part modules (mcp, sync, audit, release, assist_support) into importable code with thin facades.
- [x] 3. Convert viewer and flow part-glue into real packages with explicit imports.
- [x] 4. Replace the frontend part-glue manifests (browser-host, render-board-app, main-app) with real ES modules esbuild resolves directly, keeping bundled artifacts byte-stable.
- [x] 5. After each slice, run lint, audit, pytest, and vitest and keep all linked docs in sync.
- [x] 6. Confirm no exec(compile) loaders or regex part-manifests remain and import paths/bundles are unchanged before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_482_reunite_numbered_part_python_modules_into_importable_code`
- `item_483_convert_viewer_and_flow_part_glue_into_real_packages`
- `item_484_retune_the_source_line_budget_guardrail`
- `item_485_replace_js_part_glue_manifests_with_real_es_modules`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Orchestrate the exec part-glue remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
