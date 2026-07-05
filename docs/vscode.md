[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# VS Code Extension

The VS Code extension hosts the same local viewer served by
`logics-manager view` inside the Logics panel. The viewer remains the canonical
UI for board navigation, previews, CDX status, workspace browsing, recent
activity, Git/CI/release status, diagnostics, and workflow actions.

The extension now owns only the VS Code-specific shell:

- starting and reusing a local `logics-manager view --port 0` process;
- embedding that viewer in the Logics panel;
- opening the same viewer externally;
- restarting the managed viewer;
- focusing the viewer on the current Logics document.

Install from the Marketplace:

https://marketplace.visualstudio.com/items?itemName=cdx-logics.cdx-logics-vscode

For local development or manual VSIX testing:

```bash
npm install
npm run package
npm run install:vsix
```

## VS Code Extension Installation

This section is only for installing the VS Code extension. For the core CLI, use the `Quick Start` section in the [README](../README.md#quick-start).

### Marketplace

https://marketplace.visualstudio.com/items?itemName=cdx-logics.cdx-logics-vscode

### VSIX

```bash
code --install-extension logics-manager-<version>.vsix --force
```

If you don't have the `code` CLI on PATH:
- Windows: either use the VS Code installer option that adds `code` to PATH, or install the `.vsix` from the VS Code UI via **Extensions -> ... -> Install from VSIX...**.
- macOS/Linux: you can enable it from **Command Palette -> Shell Command: Install 'code' command in PATH**.

### Extension Development From Source

```bash
npm install
npm run compile
npm run test
```

Run the extension:
- In VS Code: **Run -> Start Debugging** (F5)
- The Extension Development Host opens.
- Open the **Logics** panel at the bottom -> **Orchestrator**.

If you prefer the terminal helper:

```bash
npm run dev
```

`npm run dev` requires the `code` CLI on PATH, so the F5 path above remains the safest cross-platform dev entrypoint.

On macOS, the one-command development check rebuilds the viewer assets and extension before opening a fresh Extension Development Host:

```bash
npm run test:vscode
```

### Startup notifications

Automatic notifications are limited to actionable environment drift: an unsupported runtime version, missing bootstrap files, an unavailable global runtime publication source, or dangerous `.gitignore` rules. Version bounds must match the extension's tested release line, and runtime publication accepts either repository workflow skills (`logics/skills`) or Logics Manager's packaged skills (`logics_manager/skill_assets`). Other diagnostics stay in **Logics: Check Environment** instead of appearing at startup.

### Browser UI Debugging

Use the real local viewer for repository data:

```bash
logics-manager view --open
```

Use the mock webview harness only when developing the shared browser/webview UI without VS Code:

```bash
npm run debug:webview
```

The harness runs at `http://localhost:4173/` and supports mock scenarios such as `/?scenario=empty` and `/?scenario=error`. It does not execute real VS Code commands or workflow writes.

## Commands

- `Logics: Refresh`
- `Logics: Open Viewer`
- `Logics: Restart Viewer`
- `Logics: Open Viewer Externally`
- `Logics: Focus Current Item`

Workflow actions that used to be separate command palette entries now live in
the embedded viewer itself. This keeps VS Code and browser usage on the same
UI and backend API.

## Embedded Viewer Parity

| Surface | VS Code behavior |
| --- | --- |
| Board, list, details, and document preview | Same viewer UI loaded from the managed local viewer server. |
| Recent activity, Git, CI, release, diagnostics | Same `/api/*` routes as the browser viewer. |
| CDX status, missions, reports | Same viewer screens and backend routes. |
| Workspace preview | Same viewer workspace browser. |
| Workflow writes and status changes | Routed through the viewer backend, not reimplemented in TypeScript. |
| File opening | Uses the viewer behavior; editor-native file opening can be added only as a documented route exception. |
| LAN mode | Use `logics-manager view --lan` or the external viewer path; LAN embedding is not a separate VS Code mode. |
| Remote VS Code / SSH / Codespaces | Not part of the first embedded-viewer milestone. |

The extension intentionally does not mirror viewer `/api/*` routes in
TypeScript. If a VS Code-only bridge becomes necessary for one action, document
that exception before adding it.
