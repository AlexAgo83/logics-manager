## task_270_orchestrate_the_exec_part_glue_remediation - Orchestrate the exec part-glue remediation
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
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
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_482_reunite_numbered_part_python_modules_into_importable_code`
- `item_483_convert_viewer_and_flow_part_glue_into_real_packages`
- `item_484_retune_the_source_line_budget_guardrail`
- `item_485_replace_js_part_glue_manifests_with_real_es_modules`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Public import paths (logics_manager.mcp, .sync, .audit, .release, .assist_support, .viewer, .flow) resolve unchanged via thin re-export facades or packages.
- request-AC3 -> This task. Proof: The numbered _01.._04 part fragments are removed; their content lives in importable, cohesively-named modules.
- request-AC5 -> This task. Proof: scripts/check-source-line-budget.mjs is retuned (raised limit or per-package allowance) so importable decomposition no longer requires text-glue, and CI still fails on genuine new monoliths.
- request-AC7 -> This task. Proof: The full pytest and vitest suites pass unchanged with no behavior regressions.
- request-AC9 -> This task. Proof: The frontend mirror of the part-glue (browser-host, render-board-app, main-app) is replaced by real ES modules imported directly by index.js; the regex string-manifests and readFileSync(...).join("") concatenation are removed, modules split by responsibility, and bundled artifacts stay byte-stable.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- lint OK; pytest 409 passed; vitest 686 passed (2026-06-22)
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_482_reunite_numbered_part_python_modules_into_importable_code`, `item_483_convert_viewer_and_flow_part_glue_into_real_packages`, `item_484_retune_the_source_line_budget_guardrail`, `item_485_replace_js_part_glue_manifests_with_real_es_modules`
- Related request(s): `req_273_replace_exec_compile_part_glue_with_importable_modules`

# AI Context
- Summary: Orchestrate the exec part-glue remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
