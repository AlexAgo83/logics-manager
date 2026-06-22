[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# VS Code Extension

The VS Code extension is the human cockpit around the same runtime. It helps you:

- browse workflow docs as a board or list;
- preview Logics Markdown with clickable references and Mermaid rendering;
- create and promote workflow items without leaving the editor;
- inspect recent activity, status, theme, confidence, stale work, and backlog coverage;
- run validation-oriented actions from the UI.

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
- `Logics: Refresh Agents`
- `Logics: Select Agent`
- `Logics: Open Item`
- `Logics: Promote Item`
- `Logics: New Request`
- `Logics: Create Companion Doc`
- `Logics: Check Environment`
- `Logics: Open Hybrid Insights`
- `Logics: Open Logics Insights`
- `Logics: Triage Item`
- `Logics: Assess Diff Risk`
- `Logics: Build Validation Checklist`
- `Logics: Review Doc Consistency`
