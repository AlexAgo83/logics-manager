## task_391_add_target_scoped_release_contracts_and_evidence - Add target-scoped release contracts and evidence
> From version: 2.22.2
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Codex
> Indicators reviewed: 2026-08-22 14:37:29

# AI Context
- Summary: Introduce a self-contained v2 target model and target-isolated evidence while normalizing v1 contracts to one implicit target.
- Keywords: add, target, scoped, release, contracts, evidence
- Use when: a repository releases more than one independently gated artefact.
- Skip when: changing an existing single-target gate without changing release-target boundaries.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_855_add_target_scoped_release_contracts_and_evidence`

# Acceptance criteria
- AC1: A v2 fixture with two named targets evaluates each target's own version policy, tag pattern, gates, validation commands, and publication requirements.
- AC2: Contract validation rejects duplicate or unsafe target IDs and every excluded target gate without a non-empty reason before release planning or evidence mutation.
- AC3: Evidence carries `target_id`; status, validation, and reset isolate evidence and state to the selected target, and a scoped reset atomically preserves every other ledger line.
- AC4: Multi-target plan, validate, evidence add, and reset reject a missing or unknown target, while status, context packs, MCP, and the viewer offer an explicit all-target overview or a selected target detail.
- AC5: Existing v1 fixtures, targetless legacy evidence, and calls without `--target` retain their current behavior; targetless evidence is not silently attributed under v2.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_391_add_target_scoped_release_contracts_and_evidence.md --progress <n>%` during multi-wave work.
- [x] Add schema and normalized-model tests for v1, two v2 targets, safe IDs, excluded-gate reasons, and explicit release identity.
- [x] Thread the selected target through plan, validate, evidence add, and reset; preserve targetless evidence only for normalized v1 and atomically retain non-selected or malformed JSONL lines.
- [x] Expose the same selected-target/detail and all-target/overview contract through CLI, context packs, MCP, and viewer APIs; cover unknown and missing target failures.
- [x] Run the existing v1 fixtures and the new two-target fixture before recording the release evidence.
- [x] Run `python3 -m logics_manager flow finish task task_391_add_target_scoped_release_contracts_and_evidence.md` after implementation.

# Validation
- (no validation recorded yet)
- command: `node scripts/ci-check.mjs --update` | result: passed | date: 2026-08-22
- Finish workflow executed on 2026-08-22.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-22.
- Linked backlog item(s): `item_855_add_target_scoped_release_contracts_and_evidence`
- Related request(s): `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`

# Links
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC4 -> This task. Proof: Implemented in commit 0780e14f: target-scoped release contracts, target_id evidence isolation, target-required plan/validate/evidence/reset, v1 compatibility, MCP/context-pack/viewer target status/reset, and regression tests. Validated with node scripts/ci-check.mjs --update: Logics lint/audit, Python ruff/function/line budgets, 1455 Python tests, JS coverage suites, viewer smoke, extension smoke, npm CLI smoke, and VSIX package validation passed. Source: `0780e14f`
- request-AC5 -> This task. Proof: Implemented in commit 0780e14f: target-scoped release contracts, target_id evidence isolation, target-required plan/validate/evidence/reset, v1 compatibility, MCP/context-pack/viewer target status/reset, and regression tests. Validated with node scripts/ci-check.mjs --update: Logics lint/audit, Python ruff/function/line budgets, 1455 Python tests, JS coverage suites, viewer smoke, extension smoke, npm CLI smoke, and VSIX package validation passed. Source: `0780e14f`
- request-AC6 -> This task. Proof: Implemented in commit 0780e14f: target-scoped release contracts, target_id evidence isolation, target-required plan/validate/evidence/reset, v1 compatibility, MCP/context-pack/viewer target status/reset, and regression tests. Validated with node scripts/ci-check.mjs --update: Logics lint/audit, Python ruff/function/line budgets, 1455 Python tests, JS coverage suites, viewer smoke, extension smoke, npm CLI smoke, and VSIX package validation passed. Source: `0780e14f`
- request-AC7 -> This task. Proof: Implemented in commit 0780e14f: target-scoped release contracts, target_id evidence isolation, target-required plan/validate/evidence/reset, v1 compatibility, MCP/context-pack/viewer target status/reset, and regression tests. Validated with node scripts/ci-check.mjs --update: Logics lint/audit, Python ruff/function/line budgets, 1455 Python tests, JS coverage suites, viewer smoke, extension smoke, npm CLI smoke, and VSIX package validation passed. Source: `0780e14f`
