## item_526_define_the_vs_code_embedded_viewer_host_contract - Define the VS Code embedded viewer host contract
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Architecture
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The migration can fail by choosing the wrong embedding model: an iframe may be fragile, while a full TypeScript route bridge would recreate the old duplicated cockpit. The project needs a small, explicit host contract before implementation slices spread across VS Code, Python, and viewer assets.

# Scope
- In:
  - Decide and document how the VS Code webview loads the canonical viewer frontend: iframe to local server, same-webview asset shell with configurable API base URL, or another minimal host approach.
  - Define how the embedded frontend discovers the local viewer API base URL, authorization headers or tokens, and CSP allowances.
  - Define which browser viewer capabilities are expected to work unchanged, which require VS Code-specific adaptation, and which are explicitly unsupported for the first parity milestone.
  - Record the decision in an ADR or update an existing ADR if it is a direct continuation of the thin-client architecture.
- Out:
  - Implementing the full embedded view.
  - Removing historical VS Code controllers.
  - Changing viewer route semantics.

# Acceptance criteria
- AC1: A committed architecture note states the chosen embedding model and rejects the main alternatives with project-specific reasons.
- AC2: The note identifies CSP, localhost access, route authorization, asset loading, and lifecycle assumptions that implementation must satisfy.
- AC3: The first milestone's supported/unsupported viewer surfaces are listed so later slices can test against a concrete contract.
- AC4: The decision preserves the canonical viewer API as the source of truth and forbids reimplementing normal viewer routes in TypeScript.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A committed architecture note states the chosen embedding model and rejects the main alternatives with project-specific reasons.
- request-AC2 -> This backlog slice. Proof: AC2: The note identifies CSP, localhost access, route authorization, asset loading, and lifecycle assumptions that implementation must satisfy.
- request-AC4 -> This backlog slice. Proof: AC3: The first milestone's supported/unsupported viewer surfaces are listed so later slices can test against a concrete contract.
- request-AC8 -> This backlog slice. Proof: AC4: The decision preserves the canonical viewer API as the source of truth and forbids reimplementing normal viewer routes in TypeScript.
- request-AC5 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC6 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC7 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC9 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC10 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_036_vs_code_embedded_viewer_parity`
- Architecture decision(s): (none yet)
- Request: `req_287_make_the_vs_code_extension_host_the_same_logics_viewer_ui`
- Primary task(s): `task_284_orchestrate_vs_code_embedded_viewer_parity`

# AI Context
- Summary: Define the VS Code embedded viewer host contract
- Keywords: scaffolded-backlog, define the vs code embedded viewer host contract, implementation-ready
- Use when: Implementing the scaffolded slice for Define the VS Code embedded viewer host contract.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_284_orchestrate_vs_code_embedded_viewer_parity` was finished via `logics-manager flow finish task` on 2026-07-05.
