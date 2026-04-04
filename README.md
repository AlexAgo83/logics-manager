# cdx-logics-vscode

[![CI](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexAgo83/cdx-logics-vscode/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/AlexAgo83/cdx-logics-vscode)](LICENSE)
![Version](https://img.shields.io/badge/version-v1.20.0-4C8BF5)
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
- Direct `Copy for Codex` and `Copy for new Codex thread` actions from the details panel for faster low-token handoffs.
- Filter defaults enabled out of the box plus a `Reset` action to restore them quickly.
- `Hide empty columns` now behaves consistently in board and list mode.
- Persisted workspace-scoped UI state for selection, search, grouping, sorting, collapses, and scroll.
- Lightweight onboarding guidance and more actionable empty states.
- Create new requests, backlog items, and tasks from the UI (uses Logics templates / Flow Manager).
- `Read` opens a rendered markdown view and interprets Mermaid diagrams in Logics docs.
- Open, read, refresh, promote, bootstrap, root-management, and agent-selection actions from the UI.
- Tools menu includes a guided `New Request` Codex entrypoint and bootstrap recovery actions.
- Tools menu now groups provider management under `AI Runtime`, with `AI Runtime Status`, `AI Provider Insights`, and the shared hybrid-assist workflow actions in one compact system surface.
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
- validation: `npm run release:changelog:validate` fails when the curated changelog for the current package version is missing

## Commands

- `Logics: Refresh`
- `Logics: Refresh Agents`
- `Logics: Select Agent`
- `Logics: Open Item`
- `Logics: Promote Item`
- `Logics: New Request`
- `Logics: Check Environment`
- `Logics: Open Hybrid Insights`
- `Logics: Triage Item`
- `Logics: Assess Diff Risk`
- `Logics: Build Validation Checklist`
- `Logics: Review Doc Consistency`

## Tools Menu

- `Select Agent` picks the active Logics agent and prepares Codex chat context.
- `New Request` opens a guided Codex drafting flow using the request-authoring agent.
- `Bootstrap Logics` installs the Logics kit into a project that is not initialized yet.
- `Update Logics Kit` runs the supported submodule update flow when the repository uses the canonical `logics/skills` kit submodule and Git state is safe for automation.
- `Publish Global Codex Kit` publishes or repairs the shared global Logics kit in `~/.codex` from the current canonical repo-local source when needed.
- `Check Environment` summarizes repository state, Python availability, Git availability, global Codex kit health, and whether read-only, workflow, bootstrap, or terminal-Codex handoff actions are currently available.
- `Check Environment` can also surface direct remediation actions when the plugin detects a stale kit or a missing global publication.
- `Check Environment` now includes hybrid assist runtime state, backend availability, degraded reasons, Claude-bridge presence, and the shared Windows-safe runtime entrypoint.
- repo-local refresh now watches `logics/**/*`, `logics.yaml`, and supported `.claude/` bridge files; external global-kit state still requires an explicit refresh because it lives outside the workspace.
- `AI Runtime Status` probes the shared `logics.py flow assist runtime-status` surface and reports ready providers, flagged providers, cooldown or credential issues, and bounded backend provenance.
- `AI Provider Insights` opens a dedicated plugin panel backed by `logics.py flow assist roi-report`, with provider mix, execution-path breakdowns, derived rates, estimated ROI proxies, and recent audit drill-down over the shared runtime output.
- `Commit All Changes` asks the shared hybrid runtime for a bounded commit plan and can execute it after explicit confirmation.
- `Suggest Next Step` asks the shared hybrid runtime for the next bounded workflow action on a selected request, backlog item, or task.
- `Triage Item` classifies a selected request, backlog item, or task through the shared hybrid runtime and keeps backend provenance visible in the completion notification.
- `Assess Diff Risk` runs the shared `diff-risk` flow directly from the plugin so the current change surface can stay local-first when policy allows it.
- `Summarize Validation` runs the shared hybrid runtime summary flow and returns a compact validation state without reimplementing runtime logic in the extension.
- `Validation Checklist` asks the shared runtime for a bounded validation checklist derived from the current diff surface.
- `Doc Consistency` runs the shared runtime review flow for workflow-doc consistency without moving validation semantics into the extension.
- On load, the extension can proactively publish or upgrade the global Codex kit from a compatible repository without requiring an explicit migration action in the normal path.
- Codex launch shown by the plugin now uses the standard `codex` command because the runtime no longer depends on a per-repo overlay launcher.
- After successful bootstrap, the extension can propose a git commit with a generated message.
- Bootstrap completion messaging now distinguishes repo-local kit readiness from global Codex kit readiness.
- `Change Project Root` / `Use Workspace Root` control which repository root the extension operates on.
- `Refresh` is available from the Tools menu to keep the main toolbar focused on view/navigation controls.
- `Fix Logics` runs Logics doc-fix flows when available.
- `About` opens the project repository information.

The plugin remains a thin client over the shared runtime:
- shared hybrid actions call `python logics/skills/logics.py flow assist ...`;
- hybrid ROI aggregation and semantics also stay in the kit through `python logics/skills/logics.py flow assist roi-report --format json`;
- the shared runtime now distinguishes deterministic helpers such as `changed-surface-summary`, `release-changelog-status`, `test-impact-summary`, and `hybrid-insights-explainer` from Ollama-first proposal flows such as `windows-compat-risk`, `review-checklist`, and `doc-link-suggestion`;
- backend routing, fallback semantics, payload validation, audit, and degraded-mode policy remain owned by the Logics kit;
- global Codex kit actions stay distinct from shared hybrid assist actions so the UI can support Codex, Claude-oriented bridges, and Windows-safe runtime paths without duplicating business logic in TypeScript.

## Codex Handoffs

The plugin now builds a lighter Codex handoff directly from the selected Logics item.

- The details panel shows a `Context pack for AI assistants` summary with docs, lines, characters, approximate token cost, and a coarse budget label.
- `summary-only` trims the handoff to the current item, compact summary points, acceptance criteria, and response contract.
- `diff-first` puts relevant changed files first when the repository has recent Git changes tied to the current item.
- Agent-aware filtering can exclude docs that do not belong to the active agent profile.
- Session-hygiene hints warn when switching item, task type, workspace root, or handoff mode makes a fresh Codex thread safer.

These flows are designed to reduce token waste without hiding the underlying Logics docs. The Markdown corpus in `logics/*` remains the source of truth; the plugin only shapes a smaller handoff from it.

## Global Codex Kit Publication

The primary Codex runtime model is now a globally published Logics kit under `~/.codex`.
Repositories still keep `logics/skills/` as the canonical source of truth, but the plugin auto-publishes or upgrades that kit into the shared Codex home when it detects a compatible canonical submodule.

Examples:

```bash
codex
cat ~/.codex/logics-global-kit.json
```

Runtime contract:

- `logics/skills/` stays canonical inside each compatible repository.
- the active shared runtime is published into the main Codex home under `~/.codex/skills`.
- the publication manifest `~/.codex/logics-global-kit.json` records installed version, source repo, source revision, publish time, and published skills.
- the plugin can auto-upgrade the shared runtime when a newer compatible repo-local kit is detected.
- repo-owned workflow documents under `logics/request`, `logics/backlog`, `logics/tasks`, product briefs, and ADRs stay inside the repository and are never globalized.

Plugin remediation path:

- if the kit is too old to act as a publication source and the repository uses the canonical `logics/skills` submodule, the plugin can run the supported kit update flow directly.
- if the global kit is missing or stale, opening a compatible repository can auto-publish it without a separate migration action in the normal path.
- if publication is unavailable or broken, the plugin exposes direct diagnostics and repair actions through `Check Environment`.
- when the global kit is healthy, the plugin can launch Codex directly and still keeps a clipboard fallback for prompt handoff flows.
- stale legacy overlay artifacts are no longer part of the normal operator path and should be treated as deprecated compatibility state.

Legacy compatibility:

- `logics_codex_workspace.py` remains available as a legacy overlay manager for transitional troubleshooting or older flows.
- overlays are no longer the primary runtime contract for the plugin or the recommended default operator path.

## Validation

- Compile: `npm run compile`
- Lint TS: `npm run lint`
- Unit tests: `npm run test`
- Logics docs lint: `npm run lint:logics`
- Logics workflow audit + docs lint: `npm run audit:logics`
- Fast extension-focused local check: `npm run ci:fast`
- Full CI-equivalent local check: `npm run ci:check`
- Security audit policy gate: `npm run audit:ci`

`npm run ci:check` mirrors the blocking repository CI contract, including Logics strict-status lint, request auto-close sync verification, workflow audit, Python tests, CLI smoke checks, TypeScript validation, extension tests, and VSIX packaging.

`npm run audit:ci` enforces the repository audit policy locally. It blocks new actionable vulnerabilities and only allows the explicitly documented temporary exceptions tracked in the backlog.

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
   - run `python logics/skills/logics.py flow assist runtime-status --format json` and confirm `windows_safe_entrypoint` still points to `python logics/skills/logics.py flow assist ...`
   - run `python logics/skills/logics.py flow assist diff-risk --backend auto --format json` and `python logics/skills/logics.py flow assist validation-checklist --backend auto --format json`
   - confirm those shared-runtime commands still work without relying on any repo-local Codex overlay path
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
