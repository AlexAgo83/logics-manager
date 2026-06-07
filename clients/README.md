# Logics Clients

This directory separates user-facing clients from the shared Logics runtime.

- `vscode/` contains the VS Code extension host implementation.
- `shared-web/` contains browser/webview assets that can be reused by the VS Code extension and the future local viewer.
- `viewer/` is reserved for the CLI-launched local browser viewer.

The Python CLI/runtime remains in `logics_manager/`.
