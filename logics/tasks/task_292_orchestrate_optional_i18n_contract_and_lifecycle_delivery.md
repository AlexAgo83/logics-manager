## task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery - Orchestrate optional i18n contract and lifecycle delivery
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Define the smallest version-1 contract, schema, and anonymized fixtures, including source-only and not-applicable states.
- [x] 2. Implement non-mutating status, plan, lint, and validate payloads before adding guarded initialization.
- [x] 3. Add safe source-only initialization with dry-run and overwrite protection, then project bounded guidance into assistant context.
- [x] 4. Make the viewer prefer valid declared contracts while preserving legacy detection for repositories that have not adopted one.
- [x] 5. Document new-project and migration workflows, run focused CLI and viewer tests plus repository validation, and close with traceability evidence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_548_define_the_versioned_optional_i18n_contract_and_schema`
- `item_549_add_i18n_contract_lifecycle_commands_and_validation`
- `item_550_make_i18n_readiness_a_default_new_project_consideration`
- `item_551_use_the_declared_i18n_contract_in_viewer_project_tools`
- `item_552_document_and_harden_the_i18n_contract_rollout`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: the v1 schema and lifecycle enforce applicability, locale roles, contained JSON paths, semantic keys, string leaves, and placeholder parity without coupling a runtime.
- request-AC2 -> This task. Proof: `i18n status|init|plan|lint|validate` provide text/JSON output; read-only commands are non-mutating and initialization refuses collisions.
- request-AC3 -> This task. Proof: absent contracts are advisory while declared invalid contracts emit deterministic schema, path, catalog, key, leaf, parity, and placeholder findings.
- request-AC4 -> This task. Proof: source-only initialization validates and `plan` reports locale additions without translating or installing a shared runtime.
- request-AC5 -> This task. Proof: bootstrap instructions and context-pack projection recommend i18n for UI work and document `not_applicable`.
- request-AC6 -> This task. Proof: viewer project tools prefer valid contracts, fail closed on invalid declarations, retain legacy detection, and bound writes to validated files.
- request-AC7 -> This task. Proof: anonymized documentation and rollout shapes passed 491 Python tests, 740 Vitest tests, TypeScript/ESLint checks, Logics lint, audit, and flow validation.

# Validation
- `python3 -m pytest tests/python`: 491 passed.
- `npm test`: 65 files and 740 tests passed.
- `npm run lint`: TypeScript, ESLint, line-budget, and generated-status checks passed.
- Rollout validation covered three existing-catalog migrations, one staged bilingual compatibility migration, and five source-only applications without exposing project identities in central docs.
- 491 Python tests, 740 Vitest tests, lint, rollout validations, and closeout preflight passed
- Finish workflow executed on 2026-07-13.
- Linked backlog/request close verification passed.

# Report
- Delivered and documented the optional i18n v1 lifecycle, new-project guidance, context projection, and contract-first viewer integration.
- Propagated the contract through nine anonymized project shapes with project-local adapters and validation evidence.
- Finished on 2026-07-13.
- Linked backlog item(s): `item_548_define_the_versioned_optional_i18n_contract_and_schema`, `item_549_add_i18n_contract_lifecycle_commands_and_validation`, `item_550_make_i18n_readiness_a_default_new_project_consideration`, `item_551_use_the_declared_i18n_contract_in_viewer_project_tools`, `item_552_document_and_harden_the_i18n_contract_rollout`
- Related request(s): `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`

# AI Context
- Summary: Orchestrate optional i18n contract and lifecycle delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
