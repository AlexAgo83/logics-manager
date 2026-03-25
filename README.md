# cdx-logics-vscode

[![CI](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/AlexAgo83/cdx-logics-vscode)](LICENSE)
![Version](https://img.shields.io/badge/version-v1.12.1-4C8BF5)
![VS Code](https://img.shields.io/badge/VS%20Code-1.86.0-007ACC?logo=visualstudiocode&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2.1.8-6E9F18?logo=vitest&logoColor=white)

Turn your `logics/*` Markdown corpus into a real delivery cockpit inside VS Code.

`cdx-logics-vscode` gives you a visual orchestration layer for the Logics workflow
(`requests -> backlog -> tasks -> specs`) without moving the source of truth out of the repository.

This is more than a workflow panel. It turns project context into a durable, inspectable memory that AI assistants can reuse across sessions, so teams spend less time re-explaining history, waste fewer tokens, and keep delivery conversations grounded in the same artifacts.

## Logics Kit Repository

This extension is designed to work with the Logics kit repository:

- Kit repo: `https://github.com/AlexAgo83/cdx-logics-kit`
- Kit releases: `https://github.com/AlexAgo83/cdx-logics-kit/releases`
- Kit README and install guide: `https://github.com/AlexAgo83/cdx-logics-kit/blob/main/README.md`

Recommended project setup keeps the kit as a submodule at `logics/skills`:

```bash
git submodule add -b main https://github.com/AlexAgo83/cdx-logics-kit.git logics/skills
git submodule update --init --recursive
```

If you already use the extension but want to inspect the workflow scripts, templates, release notes, or track kit updates independently from the plugin, start from that repository.

## Features

- Workflow visibility that feels operational, not archival: board view, grouped list view, recent activity, triage signals, and reverse references on top of the existing Markdown docs.
- Faster AI handoffs from the exact item you are working on, instead of rebuilding context manually from chat history.
- Safer day-to-day flow management with create, promote, read, bootstrap, root-management, and agent-selection actions directly in the extension.
- Flow board view plus grouped list view, with forced list mode below `500px`.
- Horizontal board scrolling, list-group collapse/expand, and improved keyboard navigation across cards and groups.
- Instant local search, explicit sorting/grouping controls, and an `Attention` triage filter for actionable items.
- Compact item previews, stronger health signals, suggested-action badges, and a recent activity panel.
- Details panel with indicators, references, reverse `Used by`, smarter default section collapse, and lifecycle confirmations for `Done` / `Obsolete`.
- `Context pack for AI assistants` in the details panel, with token estimate, budget label, task-type-specific response contract, and session-hygiene hints.
- Preview modes for Codex handoff: `standard`, `summary-only`, and `diff-first` when relevant changed files exist.
- Direct `Inject into Codex` and `Inject in fresh thread` actions from the details panel for faster low-token handoffs.
- Filter defaults enabled out of the box plus a `Reset` action to restore them quickly.
- `Hide empty columns` now behaves consistently in board and list mode.
- Persisted workspace-scoped UI state for selection, search, grouping, sorting, collapses, and scroll.
- Lightweight onboarding guidance and more actionable empty states.
- Create new requests, backlog items, and tasks from the UI (uses Logics templates / Flow Manager).
- `Read` opens a rendered markdown view and interprets Mermaid diagrams in Logics docs.
- Open, read, refresh, promote, bootstrap, root-management, and agent-selection actions from the UI.
- Tools menu includes a guided `New Request` Codex entrypoint and bootstrap recovery actions.
- Tools menu now includes shared hybrid-assist actions for `Check Hybrid Runtime`, `Commit All Changes`, `Suggest Next Step`, and `Summarize Validation`.
- Bootstrap can propose a follow-up git commit with a generated message once setup succeeds.
- Environment diagnostics now show hybrid-runtime backend readiness, degraded-state notes, Claude-bridge availability, and a Windows-safe shared runtime entrypoint.

## Why This Matters For AI Projects

- AI sessions become cheaper because the project memory already exists in the repo instead of living only in previous chats.
- Requests, backlog items, tasks, specs, and links become reusable context blocks that survive model changes, thread resets, and handoffs between assistants.
- The plugin makes that memory operational: you can inspect it, navigate it, and inject a smaller Codex handoff directly from the active item.
- That usually means lower token consumption, less context-window waste, and fewer regressions caused by missing earlier decisions.
- Because the memory is plain Markdown in git, it stays reviewable by humans, diffable in pull requests, and portable across tools.

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

- To use the extension:
  - A workspace folder open in VS Code.
  - Git on PATH for bootstrap and submodule operations.
  - `logics/` is recommended if the project is already initialized; otherwise the extension can bootstrap it for you.
  - Logics skills kit at `logics/skills/` is required for create/promote/fix flows after initialization, and can be installed via `Bootstrap Logics`.
  - Python 3 on PATH for script-backed workflow actions. The extension accepts `python3`, `python`, `py -3`, or `py`.
- To build, package, or test the extension locally:
  - Node.js + npm.
- Optional CLI tooling:
  - VS Code CLI `code` on PATH for terminal-based VSIX install or `npm run dev`.

Windows notes:
- You do not need the `code` CLI for normal extension usage inside VS Code.
- If Python is installed through the Windows launcher, `py -3` is supported by the extension.
- Repository-managed text files are normalized through [`.gitattributes`](/Users/alexandreagostini/Documents/cdx-logics-vscode/.gitattributes); let Git handle `CRLF`/`LF` conversion instead of rewriting line endings manually.

## Flow Manager Compatibility

- Minimum supported Logics kit baseline: `v1.0.4+`.
- Canonical Logics kit repo: `https://github.com/AlexAgo83/cdx-logics-kit`
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

If you don't have the `code` CLI on PATH:
- Windows: either use the VS Code installer option that adds `code` to PATH, or install the `.vsix` from the VS Code UI via **Extensions → ... → Install from VSIX...**.
- macOS/Linux: you can enable it from **Command Palette → Shell Command: Install 'code' command in PATH**.

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

If you prefer the terminal helper:

```bash
npm run dev
```

`npm run dev` requires the `code` CLI on PATH, so the F5 path above remains the safest cross-platform dev entrypoint.

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
- `Logics: Check Environment`

## Tools Menu

- `Select Agent` picks the active Logics agent and prepares Codex chat context.
- `New Request` opens a guided Codex drafting flow using the request-authoring agent.
- `Bootstrap Logics` installs the Logics kit into a project that is not initialized yet.
- `Update Logics Kit` runs the supported submodule update flow when the repository uses the canonical `logics/skills` kit submodule and Git state is safe for automation.
- `Sync Codex Overlay` runs the overlay manager from the plugin when the current kit already includes `logics_codex_workspace.py`.
- `Check Environment` summarizes repository state, Python availability, Git availability, Codex overlay runtime state, and whether read-only, workflow, bootstrap, or terminal-Codex handoff actions are currently available.
- `Check Environment` can also surface direct remediation actions when the plugin detects a stale kit or a missing or stale overlay runtime.
- `Check Environment` now includes hybrid assist runtime state, backend availability, degraded reasons, Claude-bridge presence, and the shared Windows-safe runtime entrypoint.
- `Check Hybrid Runtime` probes the shared `logics.py flow assist runtime-status` surface and reports backend provenance plus degraded-state reasons.
- `Commit All Changes` asks the shared hybrid runtime for a bounded commit plan and can execute it after explicit confirmation.
- `Suggest Next Step` asks the shared hybrid runtime for the next bounded workflow action on a selected request, backlog item, or task.
- `Summarize Validation` runs the shared hybrid runtime summary flow and returns a compact validation state without reimplementing runtime logic in the extension.
- On load, the extension can proactively propose `Update Logics Kit` or `Sync Codex Overlay` once per unresolved repository state, using the same action-confirmation pattern as bootstrap prompts.
- Overlay sync and run commands shown by the plugin now use the detected Python launcher such as `python3`, `python`, or `py -3`, instead of assuming `python` exists on every shell.
- After successful bootstrap, the extension can propose a git commit with a generated message.
- Bootstrap completion messaging now distinguishes repo-local kit readiness from Codex workspace-overlay readiness.
- `Change Project Root` / `Use Workspace Root` control which repository root the extension operates on.
- `Refresh` is available from the Tools menu to keep the main toolbar focused on view/navigation controls.
- `Fix Logics` runs Logics doc-fix flows when available.
- `About` opens the project repository information.

The plugin remains a thin client over the shared runtime:
- shared hybrid actions call `python logics/skills/logics.py flow assist ...`;
- backend routing, fallback semantics, payload validation, audit, and degraded-mode policy remain owned by the Logics kit;
- Codex overlay actions stay distinct from shared hybrid assist actions so the UI can support Codex, Claude-oriented bridges, and Windows-safe runtime paths without duplicating business logic in TypeScript.

## Codex Handoffs

The plugin now builds a lighter Codex handoff directly from the selected Logics item.

- The details panel shows a `Context pack for AI assistants` summary with docs, lines, characters, approximate token cost, and a coarse budget label.
- `summary-only` trims the handoff to the current item, compact summary points, acceptance criteria, and response contract.
- `diff-first` puts relevant changed files first when the repository has recent Git changes tied to the current item.
- Agent-aware filtering can exclude docs that do not belong to the active agent profile.
- Session-hygiene hints warn when switching item, task type, workspace root, or handoff mode makes a fresh Codex thread safer.

These flows are designed to reduce token waste without hiding the underlying Logics docs. The Markdown corpus in `logics/*` remains the source of truth; the plugin only shapes a smaller handoff from it.

## Codex Workspace Overlays

The Logics kit now includes a dedicated workspace manager for Codex multi-project usage.
Use it when you want several repositories to expose their own `logics/skills` trees to separate Codex sessions without merging everything into one global `~/.codex/skills` pool.

Examples:

```bash
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py register
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py status
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py status --all
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py doctor --fix
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync --publication-mode copy
python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex
```

Runtime contract:

- `logics/skills/` stays canonical inside each repository.
- each repository gets its own overlay under `~/.codex-workspaces/<repo-id>/`.
- repo-local Logics skills shadow same-named global skills.
- shared user assets such as `auth.json`, `config.toml`, and `skills/.system` stay global and are referenced into the overlay when available.

Plugin remediation path:

- if the kit is too old for overlays and the repository uses the canonical `logics/skills` submodule, the plugin can run the supported kit update flow directly.
- if the overlay manager exists but the workspace overlay is missing or stale, the plugin can run the overlay sync directly instead of only copying the terminal command.
- if either of those states is detected when the plugin loads, VS Code can proactively offer the relevant remediation action instead of waiting for a manual environment check.
- when the overlay is healthy, the plugin can launch the terminal Codex handoff directly and still keeps a clipboard fallback for users who prefer to inspect or reuse the command manually.
- unsupported or unsafe cases, such as a dirty worktree or a non-canonical kit layout, fall back to explicit manual guidance instead of partial automation.

## Validation

- Compile: `npm run compile`
- Lint TS: `npm run lint`
- Unit tests: `npm run test`
- Logics docs lint: `npm run lint:logics`
- Logics workflow audit + docs lint: `npm run audit:logics`
- Full CI-equivalent local check: `npm run ci:check`

CI runs compile, lint, tests, Logics docs lint, and VSIX packaging validation on every `push` and `pull_request` via `.github/workflows/ci.yml`.

## Windows Validation From macOS

Use a two-layer strategy:

- CI is the fast default. The repository now validates supported Windows flows in GitHub Actions on `windows-latest`.
- A real Windows VM is still required for targeted debugging and release confidence on shell, PATH, launcher, filesystem, and VS Code host behavior.

Recommended local VM path from macOS:

- Apple Silicon: UTM with Windows 11 ARM is the pragmatic low-cost option.
- Intel Mac: UTM or another Windows-capable VM is fine.

Suggested VM checklist:

1. Install VS Code, Git, Python 3, and Node.js inside the VM.
2. Confirm launchers from the Windows shell you actually care about (`git --version`, `py -3 --version` or `python --version`, `node --version`, `npm --version`).
3. Clone the repo, initialize submodules, and run `npm ci`.
4. Run the automated baseline first: `npm run ci:check` and `python logics/skills/tests/run_cli_smoke_checks.py`.
5. Smoke the real Windows-only paths:
   - install the `.vsix` from VS Code or with `code --install-extension ...`
   - trigger `Bootstrap Logics`
   - run `Logics: Check Environment`
   - create a request, backlog item, and task
   - promote request -> backlog and backlog -> task
   - confirm `py -3` or `python` launcher resolution works as expected
6. Use the VM for release preparation and any bug that smells like shell quoting, PATH resolution, case-insensitive paths, symlink restrictions, or extension-host behavior. Do not treat macOS-only local simulation as a full Windows substitute.

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

For multi-wave delivery work, prefer coherent checkpoints:
- update the linked Logics docs during the wave that changes the behavior;
- leave the repo in a commit-ready state at the end of the wave;
- then create the reviewed commit checkpoint instead of batching several undocumented partial states.

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
