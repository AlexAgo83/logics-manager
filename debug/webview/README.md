# Webview Debug Harness

Run the webview UI in a regular browser without VS Code runtime:

```bash
npm run debug:webview
```

Open:

- `http://localhost:4173/` (default populated scenario)
- `http://localhost:4173/?scenario=empty`
- `http://localhost:4173/?scenario=error`

## What is mocked

- `acquireVsCodeApi().getState()`
- `acquireVsCodeApi().setState()`
- `acquireVsCodeApi().postMessage()`
- Extension-to-webview `type: "data"` payload dispatch
- Harness bridge `window.__CDX_LOGICS_HARNESS__` for browser-only fallbacks and notices

## What is not mocked

- Real VS Code commands (`open`, `read`, quick picks, editor integration)
- File system writes triggered by extension host handlers
- Webview CSP/resource URI behavior (`asWebviewUri`) specific to VS Code runtime

## Browser fallback behavior

- `Change Project Root` tries `showDirectoryPicker`, then directory-input fallback, then manual path hint prompt.
- `Edit`/`Read` first try reading content from the selected directory handle, then fall back to server-relative file paths.
- `Read` opens a markdown preview tab with Mermaid rendering when diagram blocks are present (or raw file fallback if preview content is unavailable).
- `Tools > New Request` remains host-only and shows harness guidance instead of trying to emulate Codex integration.
- Board/List mode switch is available from the toolbar for compact rendering checks.
