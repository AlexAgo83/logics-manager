## item_547_harden_shared_host_parity_and_document_the_supported_project_conventions - Harden shared-host parity and document the supported project conventions
> From version: 2.17.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer integration quality
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- New project screens cross the Python host, browser renderer, project switching, LAN authorization, and VS Code embedding boundaries.
- Without explicit convention documentation, users cannot predict why a screen is editable, read-only, ambiguous, or hidden.

# Scope
- In:
  - Verify standalone and VS Code embedded navigation, refresh, minimize, project switching, and error recovery for both screens.
  - Add user documentation for explicit configuration, automatic detection order, supported formats, editability boundaries, limits, and recovery from ambiguity.
  - Add anonymized end-to-end fixtures and focused regression coverage for a JSON/CSS editable project, a source-defined read-only project, and an unsupported project.
  - Run browser-host bundling or generated asset checks required by the repository build flow.
  - Record follow-up candidates for additional adapters only when backed by an unsupported fixture or concrete project need.
- Out:
  - Adding adapters solely to demonstrate extensibility.
  - Changing unrelated viewer navigation or visual design.
  - Publishing or releasing the package.

# Acceptance criteria
- Both screens behave consistently in standalone and VS Code embedded viewer hosts.
- Project switching never retains capability state, source content, revisions, or dirty edits from the previous repository.
- Documentation explains supported conventions and why detected source modules are read-only.
- No committed fixture, documentation, mockup, or snapshot names a sampled neighboring project or contains its business content.
- Focused tests, viewer host checks, lint, and Logics validation pass with no generated-asset drift.

# AC Traceability
- request-Project navigation shows Translations and Theme only when their corresponding capability is available, in both standalone and VS Code embedded viewer contexts. -> This backlog slice. Proof: Both screens behave consistently in standalone and VS Code embedded viewer hosts.
- request-Focused Python API tests, browser-host tests, viewer asset checks, repository lint, and Logics validation pass. -> This backlog slice. Proof: Project switching never retains capability state, source content, revisions, or dirty edits from the previous repository.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_042_convention_aware_project_surfaces`
- Architecture decision(s): (none yet)
- Request: `req_294_convention_aware_project_i18n_and_theme_viewer_screens`
- Primary task(s): `task_291_orchestrate_convention_aware_i18n_and_theme_viewer_delivery`

# AI Context
- Summary: Harden shared-host parity and document the supported project conventions
- Keywords: scaffolded-backlog, harden shared-host parity and document the supported project conventions, implementation-ready
- Use when: Implementing the scaffolded slice for Harden shared-host parity and document the supported project conventions.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
