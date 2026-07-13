## item_551_use_the_declared_i18n_contract_in_viewer_project_tools - Use the declared i18n contract in viewer project tools
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer contract integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer currently infers locale paths and may infer the wrong source locale from filename ordering.
- Keeping separate viewer-only and governance configuration authoritative would create conflicting sources of truth.

# Scope
- In:
  - Read a valid project-owned i18n contract before the existing viewer configuration and convention detectors.
  - Map declared catalogs, source locale, editability, and validation diagnostics into the existing project capability payload.
  - Keep current bounded JSON and source-dictionary detection when no contract exists.
  - Fail closed for an adopted but invalid contract instead of silently falling back to another source.
  - Document migration from viewer-only i18n configuration without removing theme configuration.
- Out:
  - Changing the translation editor into a runtime application preview.
  - Editing executable source dictionaries.
  - Removing legacy detection in version 1.

# Acceptance criteria
- A valid declared contract determines catalog paths and source locale even when heuristic ordering differs.
- An invalid adopted contract produces an actionable unavailable state and no edit controls.
- A legacy repository without a contract retains current detection and editing behavior.
- All viewer reads and writes remain bounded, authorized, revision-aware, atomic, and contained in the repository.
- Python and browser tests cover declared, invalid, not-applicable, and legacy project states.

# AC Traceability
- request-The viewer prefers the project-owned contract over heuristic detection, reports contract diagnostics, preserves the current legacy fallback, and edits only validated catalog files inside the selected repository. -> This backlog slice. Proof: A valid declared contract determines catalog paths and source locale even when heuristic ordering differs.
- request-Documentation, anonymized fixtures, focused Python tests, browser-host tests, repository lint, and Logics validation pass. -> This backlog slice. Proof: An invalid adopted contract produces an actionable unavailable state and no edit controls.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_043_project_owned_internationalization_readiness`
- Architecture decision(s): (none yet)
- Request: `req_295_optional_project_owned_i18n_contract_and_lifecycle_tooling`
- Primary task(s): `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# AI Context
- Summary: Use the declared i18n contract in viewer project tools
- Keywords: scaffolded-backlog, use the declared i18n contract in viewer project tools, implementation-ready
- Use when: Implementing the scaffolded slice for Use the declared i18n contract in viewer project tools.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery`

# Notes
- Task `task_292_orchestrate_optional_i18n_contract_and_lifecycle_delivery` was finished via `logics-manager flow finish task` on 2026-07-13.
