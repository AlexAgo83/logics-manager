## req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling - Optional project-owned i18n contract and lifecycle tooling
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Internationalization governance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Define a versioned, framework-neutral internationalization contract that projects may adopt without making internationalization mandatory for existing repositories.
- Let Logics Manager initialize, inspect, plan, lint, and validate the declared contract with a lifecycle similar to the existing release contract.
- Make internationalization readiness a default consideration for new user-interface projects, even when they initially ship only one source locale.
- Let the viewer consume the declared contract as its authoritative catalog configuration while retaining bounded convention detection for legacy projects.

# Context
- The viewer already detects and edits JSON locale catalogs through a small set of conventional paths, but that capability does not define a portable project-owned governance contract.
- The release workflow demonstrates a repository-owned JSON contract, schema validation, stable status and plan payloads, CLI rendering, context projection, fixtures, and viewer integration that can be reused without copying its publication or evidence machinery.
- Observed applications use framework-specific runtime adapters but converge on stable semantic keys, one JSON catalog per locale, explicit source and default locales, deterministic fallback, and parity checks.
- Legacy repositories need advisory discovery rather than automatic failure. Once a repository declares the contract, invalid catalogs or configuration must fail validation deterministically.
- New projects should start i18n-ready, not necessarily multilingual: a single source-locale catalog and explicit contract are a valid initial state.

# Acceptance criteria
- A documented version-1 project contract under logics/i18n defines applicability, source locale, default locale, supported locales, catalog path pattern, fallback locale, stable semantic keys, string leaves, and named placeholder parity without prescribing a runtime library.
- Logics Manager exposes stable text and JSON forms of i18n status, init, plan, lint, and validate; read-only commands do not modify the repository and initialization refuses to overwrite existing sources without an explicit safe option.
- Repositories without a contract remain valid and receive an actionable advisory state, while repositories with a declared contract fail validation for schema errors, path escapes, missing catalogs, key mismatches, empty or non-string leaves, invalid semantic keys, and placeholder mismatches.
- A source-only single-locale contract is valid, and adding a locale produces a deterministic plan rather than requiring a shared runtime dependency or automatic translation.
- New-project guidance and generated assistant context recommend considering or initializing the contract for user-interface work, with an explicit not-applicable path for repositories that do not own user-facing copy.
- The viewer prefers the project-owned contract over heuristic detection, reports contract diagnostics, preserves the current legacy fallback, and edits only validated catalog files inside the selected repository.
- Documentation, anonymized fixtures, focused Python tests, browser-host tests, repository lint, and Logics validation pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)

# References
- logics/release/contract.json
- logics/release/release-contract.v1.schema.json
- logics_manager/release.py
- logics_manager/cli.py
- logics_manager/bootstrap.py
- logics_manager/viewer_project_tools.py
- docs/release.md
- docs/cli.md
- tests/python/test_release_contract_schema.py
- tests/python/test_viewer_cli.py
- tests/python/test_cli_main.py

# AI Context
- Summary: Optional project-owned i18n contract and lifecycle tooling
- Keywords: request-chain-scaffold, optional project-owned i18n contract and lifecycle tooling, development-ready
- Use when: You need to implement or review the scaffolded workflow for Optional project-owned i18n contract and lifecycle tooling.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_548_define_the_versioned_optional_i18n_contract_and_schema`
- `item_549_add_i18n_contract_lifecycle_commands_and_validation`
- `item_550_make_i18n_readiness_a_default_new_project_consideration`
- `item_551_use_the_declared_i18n_contract_in_viewer_project_tools`
- `item_552_document_and_harden_the_i18n_contract_rollout`
