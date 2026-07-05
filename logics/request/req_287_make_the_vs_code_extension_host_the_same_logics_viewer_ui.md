## req_287_make_the_vs_code_extension_host_the_same_logics_viewer_ui - Make the VS Code extension host the same Logics viewer UI
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: VS Code viewer parity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The VS Code extension's main Logics view must show the same user-facing UI as `logics-manager view`, including viewer navigation, CDX screens, workspace preview, recent activity, Git/CI/release status, and terminal/workshop surfaces where VS Code allows them.
- Viewer behavior must come from the same Python HTTP API and browser-host frontend contract used by the local browser viewer, not from a second TypeScript implementation of workflow state.
- The historical VS Code webview cockpit must be retired or reduced to a temporary fallback so users do not see divergent actions, labels, filters, or stale feature coverage.
- The VS Code container must preserve editor-native affordances that matter: workspace-root detection, command palette launch/focus commands, local process lifecycle, and explicit error recovery when the viewer server cannot start.
- Security constraints must remain explicit: the embedded VS Code view must not weaken the viewer's local-only defaults, mutating-route protections, LAN token model, or CSP boundaries.

# Context
- The product has moved ahead in the local browser viewer. The viewer now owns several surfaces that the historical VS Code webview does not expose: CDX status/missions/reports, workspace file browsing, local terminals, recent activity, Git/CI/release cockpit, project switching, LAN pairing, and richer viewer diagnostics.
- The current VS Code webview still constructs its own HTML in `logicsWebviewHtml.ts`, hydrates from `indexLogics(root)` in TypeScript, and routes many actions via `LogicsViewProvider` message handlers. That creates a second cockpit which drifts from the canonical viewer.
- The desired end state is not just launching an external browser. The VS Code panel itself should render the same viewer experience, while still allowing the CLI-launched browser viewer to exist unchanged.
- The least duplicated architecture is to run the canonical local viewer backend for the active workspace and embed the viewer frontend inside the VS Code webview, with a small bridge only where VS Code webview constraints require URI/CSP or authorization adaptation.
- Embedding the viewer by pointing an iframe at localhost may be blocked or fragile depending on VS Code webview CSP, local resource restrictions, and frame policies. A same-webview shell that loads the viewer assets and calls the local `/api/*` endpoint through explicit fetch configuration may be more robust.
- Any route bridge must preserve the viewer's existing mutating-route authorization model. Do not replace the Python API with TypeScript postMessage handlers unless a route truly cannot work from VS Code.
- The migration should be delivered in safe slices: first an embedded read-only viewer shell, then write/action parity, then command/focus integration, then legacy webview removal.

# Acceptance criteria
- AC1: The VS Code Logics panel renders the same primary viewer UI as `logics-manager view` using the canonical viewer frontend assets and visual styling.
- AC2: The embedded VS Code view reads data from the same local viewer `/api/*` contract as the browser viewer, with no duplicated TypeScript indexing or workflow-state derivation for the main UI.
- AC3: Core viewer screens work inside VS Code: workflow board/details, document preview, recent activity, Git/CI/release status, CDX status/missions/reports, workspace preview, and viewer diagnostics.
- AC4: Mutating viewer actions that are supported in the browser viewer either work inside VS Code through the same backend routes or are explicitly disabled with a clear reason when VS Code cannot support them.
- AC5: VS Code command palette entries are reduced to viewer lifecycle and focus affordances: open embedded viewer, focus a Logics ref, refresh/restart viewer, open external browser viewer, and optional LAN viewer launch.
- AC6: Historical VS Code-only cockpit commands and controllers are removed or marked fallback-only after parity is proven, so normal users do not operate two divergent UIs.
- AC7: The embedded viewer server process is lifecycle-managed by the extension: one process per workspace root, automatic reuse, restart on failure, cleanup on deactivate, and clear startup diagnostics.
- AC8: The VS Code webview CSP and local server authorization model are documented and tested so embedding the viewer does not weaken local-only security or LAN write protections.
- AC9: Regression coverage proves parity at the right level: focused unit tests for process/URL/CSP helpers, existing viewer browser-host tests still pass, and a VS Code webview smoke test confirms the embedded viewer shell loads real viewer data.
- AC10: `docs/vscode.md`, README surface descriptions, and command docs describe the VS Code extension as an embedded host for the canonical viewer rather than a separate cockpit.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_036_vs_code_embedded_viewer_parity`
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py` owns the local viewer HTTP API, including `/api/items`, `/api/status`, `/api/update-status`, CDX routes, workspace preview routes, workshop terminal routes, and LAN write gating.
- `clients/viewer/browser-host.js` and `clients/viewer/src/browser-host/**` own the browser viewer host, CDX screens, workspace browser, recent activity, Git/CI/release panels, and terminal interactions.
- `clients/viewer/viewer.css` owns the local viewer shell styling that should become the VS Code visual contract too.
- `clients/shared-web/media/**` contains shared board/details/rendering modules already consumed by both the VS Code webview and local viewer paths.
- `clients/vscode/src/logicsWebviewHtml.ts` currently builds the historical VS Code webview HTML and loads the shared-web media runtime directly.
- `clients/vscode/src/logicsViewProvider.ts` currently indexes Logics docs in TypeScript, hydrates the old webview payload, and dispatches many historical `postMessage` actions.
- `clients/vscode/src/extension.ts` contributes the current Logics view and command palette entries.
- `package.json` contributes the VS Code view, commands, packaged viewer assets, and validation scripts.
- `docs/vscode.md` still describes the VS Code extension as its own cockpit instead of an embedded view of the canonical local viewer.
- `logics/architecture/adr_012_keep_the_vs_code_plugin_as_a_thin_client_over_shared_hybrid_runtime_commands.md` establishes that the plugin should stay thin over shared runtime commands.
- `logics/architecture/adr_025_bound_viewer_cdx_modularization_around_payload_state_and_asset_sync.md` establishes the viewer asset sync and CDX modularization constraints.

# AI Context
- Summary: Make the VS Code extension host the same Logics viewer UI
- Keywords: request-chain-scaffold, make the vs code extension host the same logics viewer ui, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make the VS Code extension host the same Logics viewer UI.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_526_define_the_vs_code_embedded_viewer_host_contract`
- `item_527_add_a_vs_code_managed_local_viewer_server_lifecycle`
- `item_528_render_the_canonical_viewer_inside_the_vs_code_logics_panel`
- `item_529_bring_viewer_write_actions_and_focus_workflows_to_parity_in_vs_code`
- `item_530_retire_the_historical_vs_code_cockpit_and_command_surface`
