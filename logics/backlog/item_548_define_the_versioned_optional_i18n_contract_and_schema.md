## item_548_define_the_versioned_optional_i18n_contract_and_schema - Define the versioned optional i18n contract and schema
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Internationalization contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Current convention detection describes what the viewer happens to understand, not what a project deliberately owns.
- Without a versioned schema, source locale, fallback, catalog paths, and validation expectations can drift between projects.

# Scope
- In:
  - Define a compact version-1 JSON schema and neutral fixtures under logics/i18n.
  - Represent applicable and explicitly not-applicable projects without requiring a contract in legacy repositories.
  - Define source, default, fallback, locale list, and a repository-relative catalog path pattern.
  - Document semantic dotted keys, string-only leaves, named placeholders, and exact catalog key parity.
  - Allow one source locale as a complete initial contract state.
  - Resolve and validate every configured path inside the repository root.
- Out:
  - Runtime translation APIs or framework adapters.
  - ICU parsing, plural-rule execution, or machine translation.
  - Release-style evidence recording.

# Acceptance criteria
- The schema accepts applicable single-locale and multi-locale fixtures plus an explicit not-applicable fixture.
- The schema rejects unknown required-shape variants, invalid locale identifiers, absolute paths, and catalog patterns without a locale placeholder.
- Contract documentation distinguishes sourceLocale, defaultLocale, and fallbackLocale.
- The key and placeholder rules are deterministic and framework-neutral.
- Fixtures and documentation use neutral project identities and content.

# AC Traceability
- request-A documented version-1 project contract under logics/i18n defines applicability, source locale, default locale, supported locales, catalog path pattern, fallback locale, stable semantic keys, string leaves, and named placeholder parity without prescribing a runtime library. -> This backlog slice. Proof: The schema accepts applicable single-locale and multi-locale fixtures plus an explicit not-applicable fixture.
- request-Repositories without a contract remain valid and receive an actionable advisory state, while repositories with a declared contract fail validation for schema errors, path escapes, missing catalogs, key mismatches, empty or non-string leaves, invalid semantic keys, and placeholder mismatches. -> This backlog slice. Proof: The schema rejects unknown required-shape variants, invalid locale identifiers, absolute paths, and catalog patterns without a locale placeholder.
- request-A source-only single-locale contract is valid, and adding a locale produces a deterministic plan rather than requiring a shared runtime dependency or automatic translation. -> This backlog slice. Proof: Contract documentation distinguishes sourceLocale, defaultLocale, and fallbackLocale.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Primary task(s): `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# AI Context
- Summary: Define the versioned optional i18n contract and schema
- Keywords: scaffolded-backlog, define the versioned optional i18n contract and schema, implementation-ready
- Use when: Implementing the scaffolded slice for Define the versioned optional i18n contract and schema.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# Notes
- Task `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery` was finished via `logics-manager flow finish task` on 2026-07-13.
