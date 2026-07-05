## item_528_render_the_canonical_viewer_inside_the_vs_code_logics_panel - Render the canonical viewer inside the VS Code Logics panel
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: VS Code webview
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The current `logicsWebviewHtml.ts` builds the historical VS Code cockpit and hydrates it through VS Code messages. Users need the Logics panel to display the same viewer UI that the local browser viewer displays.

# Scope
- In:
  - Replace or gate the old webview HTML with an embedded viewer shell that loads the canonical viewer assets and points them at the managed local viewer API.
  - Configure webview CSP and resource roots so viewer CSS, browser-host JavaScript, shared media assets, Mermaid, and API fetches load inside VS Code.
  - Add a startup/loading/error state for the period before the local viewer backend is ready.
  - Make core read-only surfaces render in VS Code: workflow board/details, document preview, recent activity, status cockpit, Git/CI/release panels, CDX reports/status, and workspace preview.
  - Preserve browser viewer behavior unchanged when launched via `logics-manager view` outside VS Code.
- Out:
  - Full deletion of legacy VS Code controllers.
  - New viewer product features.
  - Remote workspace support.

# Acceptance criteria
- AC1: Opening the Logics panel in VS Code renders the canonical viewer visual shell, not the historical toolbar/details webview.
- AC2: The embedded viewer fetches real workspace data through the managed local viewer API.
- AC3: The read-only surfaces listed in scope render without console CSP errors in a VS Code extension development host.
- AC4: Browser viewer launch remains unaffected and existing viewer tests still pass.
- AC5: A smoke test or harness check verifies that the VS Code shell loads the embedded viewer and receives `/api/items` data.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Opening the Logics panel in VS Code renders the canonical viewer visual shell, not the historical toolbar/details webview.
- request-AC2 -> This backlog slice. Proof: AC2: The embedded viewer fetches real workspace data through the managed local viewer API.
- request-AC3 -> This backlog slice. Proof: AC3: The read-only surfaces listed in scope render without console CSP errors in a VS Code extension development host.
- request-AC4 -> This backlog slice. Proof: AC4: Browser viewer launch remains unaffected and existing viewer tests still pass.
- request-AC8 -> This backlog slice. Proof: AC5: A smoke test or harness check verifies that the VS Code shell loads the embedded viewer and receives `/api/items` data.
- request-AC9 -> This backlog slice. Proof: AC5: A smoke test or harness check verifies that the VS Code shell loads the embedded viewer and receives `/api/items` data.
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
- Summary: Render the canonical viewer inside the VS Code Logics panel
- Keywords: scaffolded-backlog, render the canonical viewer inside the vs code logics panel, implementation-ready
- Use when: Implementing the scaffolded slice for Render the canonical viewer inside the VS Code Logics panel.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_284_orchestrate_vs_code_embedded_viewer_parity` was finished via `logics-manager flow finish task` on 2026-07-05.
