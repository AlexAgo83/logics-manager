## item_550_make_i18n_readiness_a_default_new_project_consideration - Make i18n readiness a default new-project consideration
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project bootstrap guidance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Internationalization is usually considered only after user-visible strings have become coupled to components or source-language phrases.
- Making every repository multilingual by force would create noise for services, libraries, and prototypes that own no user-facing copy.

# Scope
- In:
  - Add concise i18n readiness guidance to generated assistant instructions and relevant new-project or bootstrap documentation.
  - Recommend i18n init when a new project will own user-facing copy.
  - Explain that one source locale is sufficient at project creation.
  - Offer an explicit not-applicable declaration or documented choice for projects without localizable UI.
  - Keep existing repositories advisory until they adopt the contract.
- Out:
  - Automatically modifying every repository during bootstrap.
  - Blocking non-UI project creation.
  - Requiring a second locale or translated values before product work begins.

# Acceptance criteria
- Fresh generated guidance mentions i18n readiness and the status/init commands without claiming the feature is mandatory.
- The guidance clearly separates applicable, source-only, multilingual, and not-applicable states.
- Existing bootstrapped repositories are not mutated merely by running a status command.
- Tests assert the generated guidance and preserve existing release guidance.

# AC Traceability
- request-New-project guidance and generated assistant context recommend considering or initializing the contract for user-interface work, with an explicit not-applicable path for repositories that do not own user-facing copy. -> This backlog slice. Proof: Fresh generated guidance mentions i18n readiness and the status/init commands without claiming the feature is mandatory.
- request-A source-only single-locale contract is valid, and adding a locale produces a deterministic plan rather than requiring a shared runtime dependency or automatic translation. -> This backlog slice. Proof: The guidance clearly separates applicable, source-only, multilingual, and not-applicable states.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Primary task(s): `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# AI Context
- Summary: Make i18n readiness a default new-project consideration
- Keywords: scaffolded-backlog, make i18n readiness a default new-project consideration, implementation-ready
- Use when: Implementing the scaffolded slice for Make i18n readiness a default new-project consideration.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# Notes
- Task `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery` was finished via `logics-manager flow finish task` on 2026-07-13.
