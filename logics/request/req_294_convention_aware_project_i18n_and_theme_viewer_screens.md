## req_294_convention_aware_project_i18n_and_theme_viewer_screens - Convention-aware project i18n and theme viewer screens
> From version: 2.17.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Convention-aware project tooling
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Add project-level viewer screens for inspecting and safely editing internationalization catalogs and visual theme tokens when a supported repository convention is detected.
- Keep unsupported projects unchanged by exposing screens only through explicit capability detection.
- Use the same browser viewer implementation in standalone and VS Code embedded contexts.
- Ground the initial conventions in anonymized repository patterns without exposing source project names, business data, or absolute paths.

# Context
- The viewer already exposes conditional capabilities, grouped navigation, repository-scoped API endpoints, browser rendering, and VS Code embedding, so project tooling can extend those existing seams.
- An anonymized sample of neighboring applications shows three recurring patterns: nested JSON files per locale, translation dictionaries embedded in source modules, and theme selection represented by CSS custom properties or source-level mode/class maps.
- Structured JSON and CSS custom properties have a safe bounded edit path. Source-module dictionaries and executable theme definitions need parsing or code generation and should initially be detected as read-only rather than rewritten heuristically.
- Viewer mutations already require origin and write-access checks; project-tool edits must preserve those controls and add repository-path allowlisting, validation, conflict detection, and atomic replacement.

# Acceptance criteria
- Viewer status reports independent i18n and theme capabilities with detected convention, source paths, read/write support, and an actionable unsupported reason without returning file contents in the status payload.
- Project navigation shows Translations and Theme only when their corresponding capability is available, in both standalone and VS Code embedded viewer contexts.
- Supported locale catalogs can be searched, compared by key, filtered for missing or extra entries, and edited without losing nested JSON structure.
- Supported CSS custom-property themes can be previewed by semantic category and edited with validation, while source-defined theme modes remain read-only.
- Every write is limited to detected files inside the selected repository, requires the existing viewer mutation authorization, detects stale revisions, validates the new representation, and replaces the target atomically.
- Fixtures and tests describe sample repositories only with neutral identifiers such as sample-json-catalog, sample-inline-dictionary, and sample-css-theme.
- Focused Python API tests, browser-host tests, viewer asset checks, repository lint, and Logics validation pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)

# References
- clients/viewer/index.html
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/render.js
- clients/viewer/src/browser-host/util.js
- clients/viewer/viewer.css
- clients/shared-web/media/hostApiContract.js
- clients/vscode/src/logicsViewProvider.ts
- logics_manager/viewer.py
- tests/viewer.browser-host.test.ts
- tests/python/test_viewer_cli.py

# AI Context
- Summary: Convention-aware project i18n and theme viewer screens
- Keywords: request-chain-scaffold, convention-aware project i18n and theme viewer screens, development-ready
- Use when: You need to implement or review the scaffolded workflow for Convention-aware project i18n and theme viewer screens.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_542_define_and_detect_bounded_project_i18n_and_theme_conventions`
- `item_543_add_translation_catalog_inspection_and_completeness_diagnostics`
- `item_544_enable_safe_editing_of_supported_json_translation_catalogs`
- `item_545_add_theme_token_inspection_and_live_preview`
- `item_546_enable_safe_editing_of_css_custom_property_theme_tokens`
- `item_547_harden_shared_host_parity_and_document_the_supported_project_conventions`
