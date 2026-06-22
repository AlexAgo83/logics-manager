## req_273_replace_exec_compile_part_glue_with_importable_modules - Replace exec(compile) part-glue with importable modules
> From version: 2.12.8
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Codebase maintainability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Every module currently assembled at runtime by exec(compile(concatenated parts)) is replaced by ordinary importable Python so that tracebacks, IDE navigation, type-checking, and static analysis work again.
- The numbered _01.._04 part fragments, which were split purely to satisfy the line budget rather than by cohesion, are reunited into importable modules or a real package with a thin re-export facade.
- The source-line budget guardrail is re-tuned so it no longer pushes contributors toward non-importable text-glue, while still preventing genuine monoliths from regressing.

# Context
- An over-engineering audit found seven modules (mcp, sync, audit, release, assist_support, viewer, flow) whose public surface is built by exec(compile(''.join(part.read_text() ...))) instead of imports.
- The earlier 'modularize-oversized-source' effort intended thin re-export facades (its AC2), but the numbered-part implementation produced non-importable fragments glued by exec, diverging from that intent.
- Because content is exec'd into the parent module's globals with the parent's __file__, tracebacks point at the wrong file, mypy/IDE cannot follow the symbols, and static analysers see empty modules.
- The split was driven by scripts/check-source-line-budget.mjs (defaultLimit 1000), a self-imposed rule, not an external tool constraint.
- viewer_parts is split by theme (cohesive) while mcp/sync/audit/release/assist_support parts are split by line count (_01.._04), so the two groups need different fixes: viewer becomes a package with imports, the numbered ones are merged or repackaged.
- Existing pytest and vitest suites cover the public behavior of every affected module and act as the regression safety net.

# Acceptance criteria
- AC1: No source file uses exec(compile(...)) to assemble a module from text parts; every affected module is imported normally.
- AC2: Public import paths (logics_manager.mcp, .sync, .audit, .release, .assist_support, .viewer, .flow) resolve unchanged via thin re-export facades or packages.
- AC3: The numbered _01.._04 part fragments are removed; their content lives in importable, cohesively-named modules.
- AC4: Tracebacks raised from these modules reference the real source file and line, verified by a test.
- AC5: scripts/check-source-line-budget.mjs is retuned (raised limit or per-package allowance) so importable decomposition no longer requires text-glue, and CI still fails on genuine new monoliths.
- AC6: No new runtime dependency is introduced; only the standard library and existing tooling are used.
- AC7: The full pytest and vitest suites pass unchanged with no behavior regressions.
- AC8: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)

# References
- `logics_manager/mcp.py` (16-line exec loader over mcp_parts/_01.._04.py)
- `logics_manager/sync.py` (exec loader over sync_parts/_01.._04.py)
- `logics_manager/audit.py` (exec loader over audit_parts/_01.._04.py)
- `logics_manager/release.py` (exec loader over release_parts/_01.._03.py)
- `logics_manager/assist_support.py` (exec loader over assist_support_parts/_01.._04.py)
- `logics_manager/viewer.py` (exec loader over 16 viewer_parts/*.py)
- `logics_manager/flow/__init__.py` (exec loader over flow parts)
- `scripts/check-source-line-budget.mjs` (self-imposed 1000-line/file budget that forced the splits)

# AI Context
- Summary: Replace exec(compile) part-glue with importable modules
- Keywords: request-chain-scaffold, replace exec(compile) part-glue with importable modules, development-ready
- Use when: You need to implement or review the scaffolded workflow for Replace exec(compile) part-glue with importable modules.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_482_reunite_numbered_part_python_modules_into_importable_code`
- `item_483_convert_viewer_and_flow_part_glue_into_real_packages`
- `item_484_retune_the_source_line_budget_guardrail`
