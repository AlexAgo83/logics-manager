# cdx-logics-vscode

VS Code extension that provides a visual orchestration panel for the Logics workflow
(requests → backlog → tasks → specs), backed by the existing Markdown files in `logics/*`.

## Features

- Flow board view (Requests / Backlog / Tasks).
- Details panel with indicators and references (Promoted from / Derived from) + reverse “Used by”.
- Create new requests from the UI (uses Logics templates).
- Open, refresh, and promote actions (with safeguards against double promotion).
- Progress-based card styling + optional hide completed.

## Requirements

- A workspace that contains a `logics/` folder.
- Logics skills kit installed at `logics/skills/` (for promote/new request).
- `python3` available on PATH (required for Logics flow scripts).

## Quick start (dev)

```bash
npm install
npm run compile
```

Run the extension:
- In VS Code: **Run → Start Debugging** (F5)
- The Extension Development Host opens.
- Open the **Logics** panel at the bottom → **Orchestrator**.

## Local install (VSIX)

```bash
npm run package
code --install-extension *.vsix
```

One-shot:
```bash
npm run install:vsix
```

## Commands

- `Logics: Refresh`
- `Logics: Open Item`
- `Logics: Promote Item`
- `Logics: New Request`

## Notes

- Promotion is only allowed for request/backlog items that are not already used.
- Items with `Progress: 100%` are treated as completed.
- The UI reads and writes the existing Markdown files; it does not manage a separate database.
