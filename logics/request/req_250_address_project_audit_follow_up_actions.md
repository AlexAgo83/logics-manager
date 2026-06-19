## req_250_address_project_audit_follow_up_actions - Address project audit follow-up actions
> From version: 2.11.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Project maintenance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Turn the full project audit findings into a tracked implementation corpus.
- Close the current security gate gap caused by npm audit findings.
- Reduce maintenance risk in the viewer and validation surfaces without disrupting the green workflow state.

# Context
- The Logics corpus is clean: status reports zero open workflow docs, health reports zero issue signals, lint passes, and workflow audit passes.
- Core technical validation is green: npm lint, Vitest, Python tests, compile, coverage, smoke, viewer smoke, package validation, docs check, and ci:check all pass.
- The standalone security policy command `npm run audit:ci` currently fails on `undici@7.27.2`, pulled through `@vscode/vsce@3.9.2 > cheerio@1.2.0`; npm reports `undici@8.5.0` as current and the advisory range is fixed at `>=7.28.0`.
- `dompurify` remains an allowed temporary audit exception via the Mermaid preview dependency chain, but the latest published version is `3.4.11`.
- Large ignored local artifacts exist in the workspace: `artifacts/`, `build/`, `.code-review-graph/`, and `logics/.cache/` together consume roughly 120 MB.
- Large maintenance surfaces remain: `clients/viewer/browser-host.js`, its packaged copy, `logics_manager/viewer.py`, and major viewer/Python test files.

# Acceptance criteria
- AC1: The npm audit policy passes without a blocking `undici` vulnerability, or the repository documents and gates a time-boxed exception with clear ownership.
- AC2: The project-level CI/check command covers the npm audit policy so `ci:check` cannot pass while `audit:ci` fails.
- AC3: The viewer refresh and CDX/session surfaces have a concrete modularization or risk-reduction plan that preserves the asset sync contract.
- AC4: Ignored local build, smoke, cache, and graph artifacts can be cleaned with a documented, bounded command.
- AC5: Low-coverage high-risk modules have targeted tests or explicit coverage goals tied to observable behavior.
- AC6: Lifecycle/integration tests have documented prerequisites and a clear path for optional or scheduled execution.
- AC7: Validation evidence includes Logics lint/audit, npm lint/test, Python tests, package validation, and npm audit policy status.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_024_project_audit_remediation_plan`
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`

# AI Context
- Summary: Address project audit follow-up actions
- Keywords: request-chain-scaffold, address project audit follow-up actions, development-ready
- Use when: You need to implement or review the scaffolded workflow for Address project audit follow-up actions.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_439_resolve_npm_audit_blocking_dependency_findings`
- `item_440_make_ci_check_enforce_npm_audit_policy`
- `item_441_plan_viewer_surface_modularization_and_asset_sync_safeguards`
- `item_442_add_local_artifact_cleanup_command`
- `item_443_target_coverage_gaps_in_high_risk_modules`
- `item_444_document_lifecycle_test_prerequisites_and_execution_path`
