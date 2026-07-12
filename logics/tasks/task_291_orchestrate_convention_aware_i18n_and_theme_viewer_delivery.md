## task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery - Orchestrate convention-aware i18n and theme viewer delivery
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Implement the bounded capability contract and anonymized fixture matrix before adding navigation or mutation endpoints.
- [ ] 2. Deliver the read-only Translations screen and completeness diagnostics, then validate project switching and payload bounds.
- [ ] 3. Add JSON catalog editing through capability-resolved cell mutations with authorization, revision checks, validation, and atomic writes.
- [ ] 4. Deliver the read-only Theme screen with isolated semantic previews and honest source-module fallback behavior.
- [ ] 5. Add bounded CSS custom-property value editing using the same mutation safety model without introducing a general CSS rewriter.
- [ ] 6. Verify standalone and VS Code parity, document the supported convention contract, run focused tests and repository validation, and close the task with traceability evidence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_542_define_and_detect_bounded_project_i18n_and_theme_conventions`
- `item_543_add_translation_catalog_inspection_and_completeness_diagnostics`
- `item_544_enable_safe_editing_of_supported_json_translation_catalogs`
- `item_545_add_theme_token_inspection_and_live_preview`
- `item_546_enable_safe_editing_of_css_custom_property_theme_tokens`
- `item_547_harden_shared_host_parity_and_document_the_supported_project_conventions`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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
- Summary: Orchestrate convention-aware i18n and theme viewer delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
