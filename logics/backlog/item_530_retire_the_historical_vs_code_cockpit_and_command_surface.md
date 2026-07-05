## item_530_retire_the_historical_vs_code_cockpit_and_command_surface - Retire the historical VS Code cockpit and command surface
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Legacy cleanup
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- After the embedded viewer reaches parity, keeping the old VS Code cockpit code and command palette actions will preserve drift risk and confuse users about which surface is canonical.

# Scope
- In:
  - Remove or fallback-gate historical VS Code-only webview rendering, TypeScript indexing for main UI hydration, and message handlers that duplicate viewer actions.
  - Reduce contributed commands in `package.json` to viewer lifecycle and focus commands plus any explicitly retained editor-native commands.
  - Delete dead controllers and tests once no production command references them.
  - Update docs to describe the VS Code extension as an embedded viewer host and list the reduced command palette surface.
- Out:
  - Deleting shared-web modules still used by the browser viewer.
  - Removing standalone browser viewer docs.
  - Changing workflow semantics or generated Logics docs.

# Acceptance criteria
- AC1: Normal VS Code use no longer exercises the historical cockpit HTML or TypeScript Logics indexing path.
- AC2: Command palette entries no longer advertise actions that are better handled inside the embedded viewer UI.
- AC3: Dead VS Code controllers and tests are removed after references are gone.
- AC4: README and `docs/vscode.md` clearly state that VS Code hosts the canonical viewer.
- AC5: `npm run lint`, focused VS Code tests, viewer tests, `logics-manager lint --require-status`, and `logics-manager audit --group-by-doc` pass.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Normal VS Code use no longer exercises the historical cockpit HTML or TypeScript Logics indexing path.
- request-AC6 -> This backlog slice. Proof: AC2: Command palette entries no longer advertise actions that are better handled inside the embedded viewer UI.
- request-AC10 -> This backlog slice. Proof: AC3: Dead VS Code controllers and tests are removed after references are gone.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_036_vs_code_embedded_viewer_parity`
- Architecture decision(s): (none yet)
- Request: `req_287_make_the_vs_code_extension_host_the_same_logics_viewer_ui`
- Primary task(s): `task_284_orchestrate_vs_code_embedded_viewer_parity`

# AI Context
- Summary: Retire the historical VS Code cockpit and command surface
- Keywords: scaffolded-backlog, retire the historical vs code cockpit and command surface, implementation-ready
- Use when: Implementing the scaffolded slice for Retire the historical VS Code cockpit and command surface.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
