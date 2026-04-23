## req_190_remove_legacy_logics_skills_and_cdx_logics_kit_references_from_active_surfaces - Remove legacy logics/skills and cdx-logics-kit references from active surfaces
> From version: 2.0.0
> Schema version: 1.0
> Status: Ready
> Understanding: 100%
> Confidence: 96%
> Complexity: High
> Theme: Runtime migration
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Remove the remaining references that keep `logics/skills` and `cdx-logics-kit` alive on active product surfaces after the runtime migration.
- Separate archival provenance from supported behavior so the repository stops teaching contributors that the retired repo boundary is part of normal use.

# Context
- The latest CI failure is not a test failure; it is a checkout failure caused by a submodule commit that is no longer fetchable from `cdx-logics-kit`.
- A full repository scan on 2026-04-23 found legacy references in CI, release workflows, runtime detection code, docs, lint config, and test fixtures.
- The repository also contains a large archival corpus of requests, tasks, backlog items, changelogs, and architecture docs that still mention the old boundary for historical reasons.
- This request only targets the active surfaces that still influence normal validation, support, and contributor expectations.

# Inventory snapshot
- Active code and CI surfaces:
  - `.github/workflows/ci.yml`
  - `.github/workflows/release.yml`
  - `.gitmodules`
  - `CONTRIBUTING.md`
  - `README.md`
  - `eslint.config.js`
  - `src/logicsProviderUtils.ts`
  - `src/workflowSupport.ts`
  - `tests/logicsCodexWorkflowController.test.ts`
  - `tests/logicsProviderUtils.more.test.ts`
  - `tests/logicsProviderUtils.test.ts`
  - `tests/logicsViewProvider-bootstrap-and-startup.test.ts`
  - `tests/logicsViewProvider-kit-update-and-migration-extra.test.ts`
  - `tests/logicsViewProvider-runtime-and-diagnostics-extra.test.ts`
  - `tests/logicsViewProvider.test.ts`
  - `tests/workflowSupport.test.ts`
- Archival documentation surfaces:
  - `changelogs/*.md`
  - `logics/INDEX.md`
  - `logics/architecture/*.md`
  - `logics/backlog/*.md`
  - `logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md`
  - `logics/request/*.md`
  - `logics/tasks/*.md`

# Problem
- The repo has already moved toward the bundled `logics-manager` model, but the remaining references still present the retired submodule as a supported runtime shape.
- CI still checks out the submodule and still executes validation steps from it, so the build depends on a repository boundary that is supposed to be gone.
- Several runtime and test helpers still treat `logics/skills` as a meaningful bootstrap or update signal instead of a historical artifact.
- User-facing docs still tell contributors to keep the old kit path initialized, which makes the migration look incomplete even when the new CLI path is in place.

# Acceptance criteria
- AC1: CI workflows no longer require a `logics/skills` checkout for supported validation runs, and `main` CI completes without a submodule fetch failure.
- AC2: `src/logicsProviderUtils.ts`, `src/workflowSupport.ts`, and the related tests no longer treat `logics/skills` or `cdx-logics-kit` as a supported runtime state, bootstrap signal, or blocking update path.
- AC3: `README.md`, `CONTRIBUTING.md`, and any other active contributor-facing docs no longer instruct normal use or maintenance of the retired submodule boundary.
- AC4: `eslint.config.js` and test fixtures no longer preserve the legacy layout unless the file is explicitly marked archival or migration-only.
- AC5: A targeted scan of the active surfaces listed above returns no `logics/skills` or `cdx-logics-kit` hits.
- AC6: Any remaining mentions of the retired repo boundary are confined to the archival corpus and are explicitly treated as historical context, not supported behavior.

# Scope
- In:
  - CI and release workflow cleanup.
  - Runtime and bootstrap detection cleanup in TypeScript.
  - Test fixture and assertion updates.
  - Contributor-facing documentation cleanup.
  - Lint/config cleanup where it encodes the retired layout as normal.
- Out:
  - Bulk rewriting of `changelogs/`, `logics/backlog/`, `logics/request/`, `logics/tasks/`, and `logics/architecture/` unless a separate archival cleanup slice is opened.
  - Any product changes unrelated to removing the legacy repo boundary from active surfaces.

# Dependencies and risks
- Some tests currently codify historical behavior; they will need to be either retired or relabeled as migration/archival coverage.
- Removing the submodule requirement from CI may expose other hidden assumptions about how the runtime is provisioned, so the workflow cleanup needs verification on both Linux and Windows.
- The archival corpus is large enough that trying to rewrite it in the same slice would create churn without changing supported behavior.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md`
- Architecture decision(s): `logics/architecture/adr_013_replace_repo_local_codex_workspace_overlays_with_a_global_published_logics_kit.md`, `logics/architecture/adr_016_use_generated_corpus_index_and_relationship_views_for_logics_navigation.md`

# AI Context
- Summary: Remove the last active references to `logics/skills` and `cdx-logics-kit` after the bundled CLI migration.
- Keywords: legacy cleanup, submodule removal, CI, docs, tests, runtime detection, kit boundary
- Use when: Use when cleaning supported code paths so the repository no longer depends on the retired skills repo.
- Skip when: Skip when only archival docs or historical notes need provenance preservation.

# Backlog
- `logics/backlog/item_349_remove_legacy_checkout_and_release_workflow_dependencies_from_ci_validation.md`
- `logics/backlog/item_350_remove_legacy_runtime_detection_and_bootstrap_signals_from_typescript_and_tests.md`
- `logics/backlog/item_351_remove_legacy_docs_lint_and_fixture_references_from_active_surfaces.md`
- `logics/tasks/task_152_orchestrate_removal_of_legacy_logics_skills_and_cdx_logics_kit_references.md`
