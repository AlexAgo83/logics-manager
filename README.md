# cdx-logics-vscode

VS Code extension that provides a visual orchestration panel for the Logics workflow
(requests → backlog → tasks → specs), backed by the existing Markdown files in `logics/*`.

## Features

- Flow board view (Requests / Backlog / Tasks / Specs).
- Details panel with indicators and references (Promoted from / Derived from) + reverse “Used by”.
- Create new requests from the UI (uses Logics templates).
- Open, refresh, and promote actions (with safeguards against double promotion).
- Progress-based card styling + optional hide completed.

<img width="789" height="727" alt="image" src="https://github.com/user-attachments/assets/baac84fa-a06c-477d-8fe1-aee23f1f1a57" />

## Requirements

- A workspace that contains a `logics/` folder.
- Logics skills kit installed at `logics/skills/` (for promote/new request).
- `python3` available on PATH (required for Logics flow scripts).
- Node.js + npm (for build/package).
- VS Code CLI `code` available on PATH (for VSIX install).

## Installation

### Install from VSIX (recommended for users)

```bash
code --install-extension cdx-logics-vscode-<version>.vsix --force
```

If you don't have the `code` CLI on PATH, enable it in VS Code:
**Command Palette → Shell Command: Install 'code' command in PATH**.

### Install from source (dev)

```bash
npm install
npm run compile
npm run test
```

Run the extension:
- In VS Code: **Run → Start Debugging** (F5)
- The Extension Development Host opens.
- Open the **Logics** panel at the bottom → **Orchestrator**.

## Deploy / Release (VSIX)

1. Bump the version in `package.json`.
2. Build and package:

```bash
npm run package
```

This creates `cdx-logics-vscode-<version>.vsix` in the repo root.

3. Smoke-test the package locally:

```bash
npm run install:vsix
```

4. Distribute the `.vsix` (e.g., attach to a GitHub release or share internally).

## Commands

- `Logics: Refresh`
- `Logics: Open Item`
- `Logics: Promote Item`
- `Logics: New Request`

## Validation

- Compile: `npm run compile`
- Unit tests: `npm run test`

CI runs these checks on every `push` and `pull_request` via `.github/workflows/ci.yml`.

## Webview Browser Debug

Run the harness server:

```bash
npm run debug:webview
```

Then open `http://localhost:4173/` and switch scenarios from the in-page debug control.

In harness mode:
- `Change Project Root` uses browser-native directory selection fallbacks.
- `Edit` and `Read` open selected files in new browser tabs (preferring File System Access API content when available).
- Host-only actions (for example `Promote`, `Fix Logics`) show explicit guidance instead of silent no-op.

## Accessibility Baseline

For new UI controls in this project:
- Every interactive control must expose an accessible name (`aria-label` or visible text).
- Icon-only controls must include a `title` tooltip for discoverability.
- Dynamic toggles must keep ARIA state in sync (`aria-expanded`, `aria-disabled`, `aria-pressed`).
- Custom interactive elements must be keyboard reachable (`tabindex`) and activatable (`Enter`/`Space`).
- Keep hover/focus descriptions consistent across toolbar, board, menus, and details panel.

## Notes

- Promotion is only allowed for request/backlog items that are not already used.
- Items with `Progress: 100%` are treated as completed.
- The UI reads and writes the existing Markdown files; it does not manage a separate database.
- For stable references in the board/details panel, use canonical markdown links:
  - `Derived from \`logics/<stage>/<file>.md\`` or `Promoted from \`...\``
  - `# Backlog` section in requests
  - `# References` and `# Used by` sections with backticked relative paths
- Legacy nested list blocks (`- References:` / `- Used by:`) are also parsed for backward compatibility.
