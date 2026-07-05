## item_529_bring_viewer_write_actions_and_focus_workflows_to_parity_in_vs_code - Bring viewer write actions and focus workflows to parity in VS Code
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Viewer action parity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Read-only rendering is not enough. The current viewer includes mutating and local-runtime actions such as status changes, new requests, bootstrap, CDX session management, Git commit/fetch, file open, workspace actions, and workshop terminals. The VS Code embed needs a deliberate parity pass so actions either work through the same routes or fail clearly.

# Scope
- In:
  - Audit all viewer `/api/*` routes used by `clients/viewer/browser-host.js` and classify them as supported in VS Code, adapted in VS Code, disabled in VS Code, or follow-up.
  - Enable supported mutating actions through the existing Python viewer backend without duplicating handlers in TypeScript.
  - Adapt file-open behavior to prefer VS Code editor opening when appropriate while preserving browser viewer behavior externally.
  - Support `--focus <ref>` equivalent behavior from VS Code commands and from current file/ref context.
  - Document and test disabled actions with clear UI feedback, especially for LAN, terminal, or OS-level actions that may not be safe or possible inside VS Code.
- Out:
  - Inventing new actions not present in the browser viewer.
  - Changing the security model to make an action easier to call from the webview.
  - Implementing all remote-development variants.

# Acceptance criteria
- AC1: A route/action parity matrix is committed and tied to tests or manual smoke proof.
- AC2: Status update, new request, document edit/read preview, CDX status/report navigation, workspace preview, Git/CI/release refresh, and diagnostics work inside VS Code through the viewer backend.
- AC3: Unsupported actions show a clear disabled state or error reason in the embedded UI.
- AC4: VS Code commands can open the embedded viewer focused on a selected Logics ref or the current Logics document.
- AC5: Security-sensitive mutating actions still satisfy the viewer's local authorization and CSRF/origin expectations.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A route/action parity matrix is committed and tied to tests or manual smoke proof.
- request-AC4 -> This backlog slice. Proof: AC2: Status update, new request, document edit/read preview, CDX status/report navigation, workspace preview, Git/CI/release refresh, and diagnostics work inside VS Code through the viewer backend.
- request-AC5 -> This backlog slice. Proof: AC3: Unsupported actions show a clear disabled state or error reason in the embedded UI.
- request-AC8 -> This backlog slice. Proof: AC4: VS Code commands can open the embedded viewer focused on a selected Logics ref or the current Logics document.
- request-AC9 -> This backlog slice. Proof: AC5: Security-sensitive mutating actions still satisfy the viewer's local authorization and CSRF/origin expectations.
- request-AC6 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC7 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
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
- Summary: Bring viewer write actions and focus workflows to parity in VS Code
- Keywords: scaffolded-backlog, bring viewer write actions and focus workflows to parity in vs code, implementation-ready
- Use when: Implementing the scaffolded slice for Bring viewer write actions and focus workflows to parity in VS Code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_284_orchestrate_vs_code_embedded_viewer_parity` was finished via `logics-manager flow finish task` on 2026-07-05.
