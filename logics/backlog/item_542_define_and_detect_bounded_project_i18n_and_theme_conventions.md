## item_542_define_and_detect_bounded_project_i18n_and_theme_conventions - Define and detect bounded project i18n and theme conventions
> From version: 2.17.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Project capability detection
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer has no contract for discovering project-level i18n or theme sources.
- Broad heuristic scanning could be slow, ambiguous, or unsafe, while requiring one hard-coded project layout would make the screens too narrow.

# Scope
- In:
  - Extend the existing viewer project capability payload with independent i18n and theme entries.
  - Define an optional repository configuration that can select source paths and conventions explicitly.
  - Add bounded zero-configuration detection for locale-directory JSON catalogs, source-module dictionaries as read-only, CSS custom-property token files, and source-defined theme modes as read-only.
  - Return normalized repo-relative paths, convention identifiers, editability, and detection messages without loading catalog contents into the general status response.
  - Add anonymized fixtures for supported, read-only, ambiguous, malformed, and absent conventions.
- Out:
  - A dynamic adapter registry or plugin loader.
  - Unbounded repository scans or dependency execution during detection.
  - Editing source-module dictionaries or theme maps.

# Acceptance criteria
- Explicit configuration wins over automatic detection and invalid configured paths fail closed with a useful reason.
- Automatic detection examines a documented bounded set of candidate paths and files.
- Ambiguous matches are reported as non-editable until explicitly configured.
- All returned paths are normalized, repository-relative, and verified to remain inside the selected repository.
- Unit tests cover supported, read-only, ambiguous, malformed, missing, and path-escape cases.

# AC Traceability
- request-Viewer status reports independent i18n and theme capabilities with detected convention, source paths, read/write support, and an actionable unsupported reason without returning file contents in the status payload. -> This backlog slice. Proof: Explicit configuration wins over automatic detection and invalid configured paths fail closed with a useful reason.
- request-Fixtures and tests describe sample repositories only with neutral identifiers such as sample-json-catalog, sample-inline-dictionary, and sample-css-theme. -> This backlog slice. Proof: Automatic detection examines a documented bounded set of candidate paths and files.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Define and detect bounded project i18n and theme conventions
- Keywords: scaffolded-backlog, define and detect bounded project i18n and theme conventions, implementation-ready
- Use when: Implementing the scaffolded slice for Define and detect bounded project i18n and theme conventions.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery` was finished via `logics-manager flow finish task` on 2026-07-13.
