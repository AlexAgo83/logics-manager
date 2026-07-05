## item_527_add_a_vs_code_managed_local_viewer_server_lifecycle - Add a VS Code-managed local viewer server lifecycle
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: VS Code runtime
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The VS Code panel cannot embed the canonical viewer until the extension can reliably start, reuse, restart, and stop a `logics-manager view` backend for the active workspace root.

# Scope
- In:
  - Add a small viewer server manager in `clients/vscode/src` that launches the bundled `logics-manager view` runtime on an ephemeral loopback port for the selected workspace root.
  - Reuse an existing running process for the same root and avoid starting duplicate servers for repeated panel resolves or refresh commands.
  - Expose startup state, URL, port, process exit, stderr summary, and restart action to the webview shell and command palette.
  - Clean up the child process on extension deactivate and when the workspace root changes if reuse is not valid.
  - Add focused tests for command construction, root switching, process reuse, failure reporting, and deactivate cleanup using mocked process launchers.
- Out:
  - Rendering the embedded viewer shell.
  - Implementing viewer UI features.
  - Supporting remote/tunneled VS Code workspaces beyond explicit diagnostics.

# Acceptance criteria
- AC1: The extension can start a local viewer backend for the current workspace root and reports the selected URL to callers.
- AC2: Repeated opens for the same root reuse the existing server instead of starting duplicates.
- AC3: Startup failures show actionable diagnostics in a VS Code output channel and in the panel placeholder.
- AC4: Deactivate and root changes stop or retire managed processes without leaving stale child processes.
- AC5: Unit tests cover lifecycle success, reuse, failure, and cleanup paths.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The extension can start a local viewer backend for the current workspace root and reports the selected URL to callers.
- request-AC7 -> This backlog slice. Proof: AC2: Repeated opens for the same root reuse the existing server instead of starting duplicates.
- request-AC9 -> This backlog slice. Proof: AC3: Startup failures show actionable diagnostics in a VS Code output channel and in the panel placeholder.
- request-AC4 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC5 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC6 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
- request-AC8 -> This backlog slice. Proof: Implemented by task_284: ADR 026, viewer server manager, embedded iframe shell, reduced VS Code command surface, docs parity matrix; validation passed with npm run lint, npm test, npm run compile, npm run test:viewer-smoke, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `task_284_orchestrate_vs_code_embedded_viewer_parity`
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
- Summary: Add a VS Code-managed local viewer server lifecycle
- Keywords: scaffolded-backlog, add a vs code-managed local viewer server lifecycle, implementation-ready
- Use when: Implementing the scaffolded slice for Add a VS Code-managed local viewer server lifecycle.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_284_orchestrate_vs_code_embedded_viewer_parity` was finished via `logics-manager flow finish task` on 2026-07-05.
