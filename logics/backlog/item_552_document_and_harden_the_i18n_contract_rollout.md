## item_552_document_and_harden_the_i18n_contract_rollout - Document and harden the i18n contract rollout
> From version: 2.17.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 30%
> Complexity: Medium
> Theme: Internationalization adoption
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A contract is only useful if project maintainers can adopt it incrementally and understand why validation fails.
- Examples copied from real neighboring repositories could expose identities or couple the feature to one application.

# Scope
- In:
  - Document source-only initialization, adding a locale, adopting existing JSON catalogs, and migrating source-language-key dictionaries.
  - Document command exit behavior, CI usage, viewer precedence, recovery from invalid contracts, and not-applicable projects.
  - Add anonymized fixtures covering common JSON catalog layouts and migration states.
  - Run CLI, context, bootstrap, viewer, lint, and Logics validation suites relevant to the feature.
  - Record later candidates only when a concrete unsupported runtime or message syntax requires them.
- Out:
  - Per-framework runtime tutorials beyond a minimal adapter boundary.
  - Real project names, business copy, client data, or absolute paths in fixtures and documentation.
  - A translation management platform integration.

# Acceptance criteria
- Documentation gives a complete source-only and existing-catalog adoption path.
- Examples use neutral names and contain no sampled business data or absolute local paths.
- CI guidance uses the contract validator without requiring a runtime dependency.
- Relevant tests, repository lint, and Logics validation pass without generated-asset drift.

# AC Traceability
- request-Documentation, anonymized fixtures, focused Python tests, browser-host tests, repository lint, and Logics validation pass. -> This backlog slice. Proof: Documentation gives a complete source-only and existing-catalog adoption path.
- request-New-project guidance and generated assistant context recommend considering or initializing the contract for user-interface work, with an explicit not-applicable path for repositories that do not own user-facing copy. -> This backlog slice. Proof: Examples use neutral names and contain no sampled business data or absolute local paths.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Primary task(s): `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# AI Context
- Summary: Document and harden the i18n contract rollout
- Keywords: scaffolded-backlog, document and harden the i18n contract rollout, implementation-ready
- Use when: Implementing the scaffolded slice for Document and harden the i18n contract rollout.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
