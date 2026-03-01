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

## What is not mocked

- Real VS Code commands (`open`, `read`, quick picks, editor integration)
- File system writes triggered by extension host handlers
- Webview CSP/resource URI behavior (`asWebviewUri`) specific to VS Code runtime

