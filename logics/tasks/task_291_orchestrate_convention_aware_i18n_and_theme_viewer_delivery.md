## task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery - Orchestrate convention-aware i18n and theme viewer delivery
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Implement the bounded capability contract and anonymized fixture matrix before adding navigation or mutation endpoints.
- [x] 2. Deliver the read-only Translations screen and completeness diagnostics, then validate project switching and payload bounds.
- [x] 3. Add JSON catalog editing through capability-resolved cell mutations with authorization, revision checks, validation, and atomic writes.
- [x] 4. Deliver the read-only Theme screen with isolated semantic previews and honest source-module fallback behavior.
- [x] 5. Add bounded CSS custom-property value editing using the same mutation safety model without introducing a general CSS rewriter.
- [x] 6. Verify standalone and VS Code parity, document the supported convention contract, run focused tests and repository validation, and close the task with traceability evidence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_542_define_and_detect_bounded_project_i18n_and_theme_conventions`
- `item_543_add_translation_catalog_inspection_and_completeness_diagnostics`
- `item_544_enable_safe_editing_of_supported_json_translation_catalogs`
- `item_545_add_theme_token_inspection_and_live_preview`
- `item_546_enable_safe_editing_of_css_custom_property_theme_tokens`
- `item_547_harden_shared_host_parity_and_document_the_supported_project_conventions`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `viewer_project_capabilities` now exposes independent i18n/theme convention, source, editability, and error details without source contents.
- request-AC2 -> The conditional Project menu and both screens are implemented in the shared browser host used standalone and in VS Code.
- request-AC3 -> JSON catalogs render aligned dotted keys, locale diagnostics, search, and revision-guarded existing-value edits.
- request-AC4 -> CSS custom properties render semantic previews and safe edits; source dictionaries and theme modes remain read-only.
- request-AC5 -> Mutations resolve detected sources server-side, reuse viewer authorization, reject stale/structural input, and atomically replace files.
- request-AC6 -> Fixtures and documentation use neutral sample data and contain no sampled neighboring-project identity.
- request-AC7 -> Full Vitest, Python, lint, line-budget, status-constant, and viewer-host checks pass.

# Validation
- `npm run lint` passed, including TypeScript, ESLint, source line budgets, and generated status constants.
- `npm test` passed: 65 files and 739 tests.
- `python3 -m pytest -q` passed: 483 tests.
- `npm run check:viewer-host` passed with the generated browser host in sync.
- `logics-manager flow validate req_294_convention_aware_project_i18n_and_theme_viewer_screens` passed.
- `logics-manager lint --require-status` and `logics-manager audit --group-by-doc` passed.
- Finish workflow executed on 2026-07-13.
- Linked backlog/request close verification passed.

# Report
- Added `.logics-viewer.json` overrides plus bounded automatic detection for JSON locale catalogs, inline source dictionaries, CSS custom properties, and source-defined theme modes.
- Added project-scoped read and mutation APIs with size limits, normalized repository paths, revision conflicts, validation, and atomic writes.
- Added conditional Translations and Theme screens with diagnostics, search, semantic token grouping, safe previews, and existing-value editing.
- Kept executable translation/theme sources read-only and isolated project token previews from the viewer shell.
- Documented supported conventions, limits, safety behavior, and explicit configuration in `docs/cli.md`.
- Finished on 2026-07-13.
- Linked backlog item(s): `item_542_define_and_detect_bounded_project_i18n_and_theme_conventions`, `item_543_add_translation_catalog_inspection_and_completeness_diagnostics`, `item_544_enable_safe_editing_of_supported_json_translation_catalogs`, `item_545_add_theme_token_inspection_and_live_preview`, `item_546_enable_safe_editing_of_css_custom_property_theme_tokens`, `item_547_harden_shared_host_parity_and_document_the_supported_project_conventions`
- Related request(s): `req_294_convention_aware_project_i18n_and_theme_viewer_screens`

# AI Context
- Summary: Orchestrate convention-aware i18n and theme viewer delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
