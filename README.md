# cdx-logics-vscode

[![CI](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/AlexAgo83/cdx-logics-vscode)](LICENSE)
![Version](https://img.shields.io/badge/version-v1.10.1-4C8BF5)
![VS Code](https://img.shields.io/badge/VS%20Code-1.86.0-007ACC?logo=visualstudiocode&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2.1.8-6E9F18?logo=vitest&logoColor=white)

VS Code extension that provides a visual orchestration panel for the Logics workflow
(requests → backlog → tasks → specs), backed by the existing Markdown files in `logics/*`.

It is not only a workflow UI: the Logics kit is also a way to persist project context in structured Markdown so AI assistants do not need the whole project to be re-explained in every prompt. In practice, that gives teams a durable, inspectable project memory, reduces token usage, and makes AI-driven development sessions more stable over time.

## Features

- Flow board view plus grouped list view, with forced list mode below `500px`.
- Horizontal board scrolling, list-group collapse/expand, and improved keyboard navigation across cards and groups.
- Instant local search, explicit sorting/grouping controls, and an `Attention` triage filter for actionable items.
- Compact item previews, stronger health signals, suggested-action badges, and a recent activity panel.
- Details panel with indicators, references, reverse `Used by`, smarter default section collapse, and lifecycle confirmations for `Done` / `Obsolete`.
- Filter defaults enabled out of the box plus a `Reset` action to restore them quickly.
- `Hide empty columns` now behaves consistently in board and list mode.
- Persisted workspace-scoped UI state for selection, search, grouping, sorting, collapses, and scroll.
- Lightweight onboarding guidance and more actionable empty states.
- Create new requests, backlog items, and tasks from the UI (uses Logics templates / Flow Manager).
- `Read` opens a rendered markdown view and interprets Mermaid diagrams in Logics docs.
- Open, read, refresh, promote, bootstrap, root-management, and agent-selection actions from the UI.
- Tools menu includes a guided `New Request` Codex entrypoint and bootstrap recovery actions.
- Bootstrap can propose a follow-up git commit with a generated message once setup succeeds.

## Why This Matters For AI Projects

- Logics turns scattered AI chat history into explicit project artifacts stored in the repo.
- Requests, backlog items, tasks, specs, and links act as long-lived context that can be reused across sessions and across assistants.
- Instead of repasting large amounts of project history into every prompt, the assistant can rely on the structured `logics/*` corpus as the project memory.
- That usually means lower token consumption, less context-window waste, and fewer regressions caused by missing prior decisions.
- Because the context is written as Markdown in the repository, it stays reviewable by humans, diffable in git, and portable across tools.

<table>
  <tr>
    <td align="center">
      <img width="100%" alt="Board panel" src="https://i.postimg.cc/g05Bf1j7/board_panel.png" />
      <br />
      <sub><strong>Board panel</strong></sub>
    </td>
    <td align="center">
      <img width="100%" alt="Filter panel" src="https://i.postimg.cc/CKt6W956/filter-panel.png" />
      <br />
      <sub><strong>Filter panel</strong></sub>
    </td>
    <td align="center">
      <img width="100%" alt="List panel" src="https://i.postimg.cc/YSVyJT0D/list_panel.png" />
      <br />
      <sub><strong>List panel</strong></sub>
    </td>
  </tr>
</table>

## Requirements

- A workspace folder open in VS Code.
- Git available on PATH for bootstrap and submodule operations.
- `logics/` is recommended if the project is already initialized; otherwise the extension can bootstrap it for you.
- Logics skills kit at `logics/skills/` is required for create/promote/fix flows after initialization, and can be installed via `Bootstrap Logics`.
- `python3` available on PATH (required for Logics flow scripts).
- Node.js + npm (for build/package).
- VS Code CLI `code` available on PATH (for VSIX install).

## Flow Manager Compatibility

- Minimum supported Logics kit baseline: `v1.0.5+`.
- Required script path: `logics/skills/logics-flow-manager/scripts/logics_flow.py`.
- If the script is missing or incompatible, create/promote actions fail with explicit error messaging in the extension.

### Flow-manager smoke checklist

- Create a request from UI (`New Request`) and confirm markdown is generated.
- Create a backlog item and a task from the UI and confirm markdown is generated.
- Open `Read` on a Mermaid-bearing doc and confirm the graph is rendered.
- Promote request -> backlog and confirm links are updated.
- Promote backlog -> task and confirm task document is generated.
- Refresh board/details and confirm data remains consistent.

## Installation

### Install from Marketplace

https://marketplace.visualstudio.com/items?itemName=cdx-logics.cdx-logics-vscode

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
2. Curate the matching changelog entry in `changelogs/CHANGELOGS_X_Y_Z.md`.
3. Validate that the changelog matches the current package version:

```bash
npm run release:changelog:validate
```

4. Build and package:

```bash
npm run package
```

This creates `cdx-logics-vscode-<version>.vsix` in the repo root.

5. Smoke-test the package locally:

```bash
npm run install:vsix
```

6. Distribute the `.vsix` and use the curated file in `changelogs/` for the GitHub release body when publishing.

## Curated Changelogs

Versioned release notes for the main extension live in [`changelogs/`](/Users/alexandreagostini/Documents/cdx-logics-vscode/changelogs).

Contract:
- filename pattern: `CHANGELOGS_X_Y_Z.md`
- version source of truth: root `package.json`
- helper: `npm run release:changelog:resolve`
- validation: `npm run release:changelog:validate`

## Commands

- `Logics: Refresh`
- `Logics: Refresh Agents`
- `Logics: Select Agent`
- `Logics: Open Item`
- `Logics: Promote Item`
- `Logics: New Request`

## Tools Menu

- `Select Agent` picks the active Logics agent and prepares Codex chat context.
- `New Request` opens a guided Codex drafting flow using the request-authoring agent.
- `Bootstrap Logics` installs the Logics kit into a project that is not initialized yet.
- After successful bootstrap, the extension can propose a git commit with a generated message.
- `Change Project Root` / `Use Workspace Root` control which repository root the extension operates on.
- `Refresh` is available from the Tools menu to keep the main toolbar focused on view/navigation controls.
- `Fix Logics` runs Logics doc-fix flows when available.
- `About` opens the project repository information.

## Validation

- Compile: `npm run compile`
- Lint TS: `npm run lint`
- Unit tests: `npm run test`
- Logics docs lint: `npm run lint:logics`
- Logics workflow audit + docs lint: `npm run audit:logics`
- Full CI-equivalent local check: `npm run ci:check`

CI runs compile, lint, tests, Logics docs lint, and VSIX packaging validation on every `push` and `pull_request` via `.github/workflows/ci.yml`.

## Closing Logics Work

Do not mark a Logics task as `Done` by editing markdown indicators manually.
Use the flow-manager guarded finish command so closure propagates correctly from task -> backlog -> request and the linked chain is verified.

```bash
npm run logics:finish:task -- logics/tasks/task_020_orchestration_delivery_for_req_019_req_020_and_req_021.md
```

This uses the kit-native command:
- `logics_flow.py finish task ...`

If you want a full repository-wide check afterward, run:
- `npm run audit:logics`

If you edit statuses by hand, the docs can look valid while the request/backlog chain is left out of sync.

## Webview Browser Debug

Run the harness server:

```bash
npm run debug:webview
```

Then open `http://localhost:4173/` and switch scenarios from the in-page debug control.

In harness mode:
- `Change Project Root` uses browser-native directory selection fallbacks.
- `Edit` and `Read` open selected files in new browser tabs (preferring File System Access API content when available).
- `Read` renders markdown with Mermaid support in the browser preview tab.
- Host-only actions (for example `Promote`, `Fix Logics`) show explicit guidance instead of silent no-op.
- Add `?debug-ui=1` to the harness URL to enable verbose UI state transition logs in browser console.

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
- For companion docs (`prod_*`, `adr_*`), `Related request/backlog/task/architecture` indicators are also indexed as managed-doc links.
- Companion docs should still mirror those links under `# References` with canonical relative paths so the kit and plugin stay aligned.
- Legacy nested list blocks (`- References:` / `- Used by:`) are also parsed for backward compatibility.
