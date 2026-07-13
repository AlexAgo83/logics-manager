## item_549_add_i18n_contract_lifecycle_commands_and_validation - Add i18n contract lifecycle commands and validation
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Internationalization CLI
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Projects cannot currently ask Logics Manager whether their translation contract is absent, declared, incomplete, or valid.
- Hand-created catalogs commonly drift in keys and placeholders and may accidentally reference files outside the intended repository.

# Scope
- In:
  - Add i18n status, init, plan, lint, and validate command routing with stable text and JSON payloads.
  - Keep status, plan, lint, and validate non-mutating.
  - Make init create the smallest valid source-only contract and source catalog, with dry-run and overwrite protection.
  - Validate contract schema, containment, catalog existence, JSON shape, semantic keys, exact locale parity, empty values, and named placeholder parity.
  - Return advisory success when no contract exists and strict failure after adoption.
  - Project the bounded status and safe next actions into shared context surfaces where release guidance is already exposed.
- Out:
  - Generating translations or installing runtime dependencies.
  - Statically proving every application call site in the first version.
  - A daemon, remote service, or central contract registry.

# Acceptance criteria
- Every command supports documented text and JSON output with deterministic exit behavior.
- Read-only commands leave tracked and untracked repository state unchanged.
- Initialization dry-run reports proposed paths and initialization refuses ambiguous or pre-existing sources by default.
- Validation reports precise locale, key, path, and placeholder findings without exposing unrelated file contents.
- Focused tests cover absent, not-applicable, valid single-locale, valid multi-locale, malformed, escaping, mismatched, and unsafe initialization cases.

# AC Traceability
- request-Logics Manager exposes stable text and JSON forms of i18n status, init, plan, lint, and validate; read-only commands do not modify the repository and initialization refuses to overwrite existing sources without an explicit safe option. -> This backlog slice. Proof: Every command supports documented text and JSON output with deterministic exit behavior.
- request-Repositories without a contract remain valid and receive an actionable advisory state, while repositories with a declared contract fail validation for schema errors, path escapes, missing catalogs, key mismatches, empty or non-string leaves, invalid semantic keys, and placeholder mismatches. -> This backlog slice. Proof: Read-only commands leave tracked and untracked repository state unchanged.
- request-A source-only single-locale contract is valid, and adding a locale produces a deterministic plan rather than requiring a shared runtime dependency or automatic translation. -> This backlog slice. Proof: Initialization dry-run reports proposed paths and initialization refuses ambiguous or pre-existing sources by default.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Primary task(s): `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# AI Context
- Summary: Add i18n contract lifecycle commands and validation
- Keywords: scaffolded-backlog, add i18n contract lifecycle commands and validation, implementation-ready
- Use when: Implementing the scaffolded slice for Add i18n contract lifecycle commands and validation.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
