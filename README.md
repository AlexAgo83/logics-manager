# logics-manager

[![CI](https://github.com/AlexAgo83/logics-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexAgo83/logics-manager/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/AlexAgo83/logics-manager)](LICENSE)
![Version](https://img.shields.io/badge/version-v2.9.5-4C8BF5)
![VS Code](https://img.shields.io/badge/VS%20Code-1.86.0-007ACC?logo=visualstudiocode&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1.2-6E9F18?logo=vitest&logoColor=white)

`logics-manager` is a local workflow runtime for projects that keep their delivery memory in Markdown.

The core product is the CLI. It creates, promotes, validates, audits, and closes the `logics/*` documents that describe work:

```text
request -> backlog item -> task -> implementation
```

Everything else in this repository is a client around that runtime:

- the VS Code extension gives humans a board, details panel, previews, search, and insights;
- the MCP server gives assistants a bounded tool API over the same CLI;
- the npm package and Python package are distribution paths for the same runtime.

The source of truth stays in your repository. Logics documents are plain Markdown, versioned with git, readable in reviews, and reusable by humans or AI assistants across sessions.

## What It Solves

AI-heavy projects often lose context between chats, agents, and implementation passes. Logics turns that context into durable project artifacts:

- `request`: the problem, need, and acceptance criteria;
- `backlog item`: a scoped delivery slice;
- `task`: executable implementation work;
- `product brief`: product framing and intent;
- `ADR`: architectural decisions;
- `spec`: behavioral contract.

The result is a repo-local memory layer that reduces re-explaining, keeps implementation grounded, and gives every assistant or human the same inspectable workflow state.

## Product Shape

`logics-manager` has one core and several integrations:

| Layer | Purpose |
| --- | --- |
| CLI runtime | Canonical workflow engine for creating, promoting, auditing, repairing, and closing Logics docs. |
| VS Code extension | Human-facing cockpit for navigating and managing the Markdown corpus. |
| MCP server | Assistant-facing adapter that exposes bounded Logics tools without giving agents a shell. |
| npm / Python packaging | Installation paths for the same CLI/runtime. |

The CLI owns the behavior. The extension and MCP server call into it instead of reimplementing workflow logic.

## Quick Start

The recommended install path is the **npm package**. It bundles the CLI
runtime in a self-contained launcher that works the same on macOS,
Linux, and Windows / WSL:

```bash
npm install -g @grifhinz/logics-manager
logics-manager --help
```

Install the CLI from this repository when developing locally:

```bash
python3.11 -m pip install .
logics-manager --help
```

### Python install paths (legacy, not recommended)

> **Deprecated.** `pip` and `pipx` installs are still published for
> backwards compatibility, but they are no longer the supported path:
> they break on PEP 668 distros, on WSL (slow `/mnt/<drive>` IO and
> `gio` opener failures), and on Python interpreters that diverge from
> the build matrix. Prefer the npm install above. The PyPI release will
> keep shipping — we only stop recommending it for end users.

PyPI:

```bash
python3.11 -m pip install logics-manager
```

Isolated user-level install via `pipx` (still published, no longer
recommended; reach for npm if you hit PEP 668 or externally-managed
Python errors):

```bash
pipx install logics-manager
```

Initialize or check a repository:

```bash
logics-manager bootstrap --check
```

Create the first workflow document:

```bash
logics-manager flow new request --title "Improve onboarding"
```

Validate the workflow corpus:

```bash
logics-manager lint --require-status
logics-manager audit
```

## Core CLI

The CLI is the stable contract for Logics. It supports:

- bootstrapping the `logics/` tree;
- creating requests, backlog items, tasks, product briefs, and ADRs;
- promoting request -> backlog and backlog -> task;
- splitting large requests or backlog items;
- closing tasks, backlog items, and requests with consistency checks;
- linting and auditing workflow traceability;
- exporting indexes, context packs, and graph data;
- serving a read-only local browser viewer for the Logics corpus;
- serving the bounded MCP tool surface.

Useful commands:

```bash
logics-manager flow list
logics-manager flow show req_001_example
logics-manager flow promote request-to-backlog req_001_example
logics-manager flow promote backlog-to-task item_001_example
logics-manager flow finish task task_001_example
logics-manager sync read-doc req_001_example --max-chars 6000
logics-manager sync context-pack req_001_example task_001_example --format json
logics-manager sync refresh-mermaid-signatures task_001_example
logics-manager flow closeout task_001_example --validation-command "pytest tests" --validation-result passed --lint --audit
logics-manager view --open
logics-manager view --focus req_001_example --read --open
```

### Agent workflow cookbook

For bounded workflow inspection, prefer `logics-manager flow show <ref>` or
`logics-manager sync read-doc <ref>` before reading Markdown directly. Both
commands include useful body content in text mode and keep JSON output available
with `--format json`.

For linked context, use `logics-manager sync context-pack <refs...>` with a
small set of request, backlog, or task refs. The command deduplicates each
ref's direct neighborhood and supports `--mode diff-first` when recent changes
matter.

For targeted hygiene repair, use
`logics-manager sync refresh-mermaid-signatures <refs-or-paths...>` or
`--changed-only` to avoid unrelated workflow diffs. For end-of-delivery cleanup,
use `logics-manager flow closeout <task>` with validation evidence plus
`--lint --audit` when you want the command to run the gates before reporting.

### Local Browser Viewer

Use the CLI viewer when you want to inspect the Logics corpus outside VS Code:

```bash
logics-manager view --open
```

The viewer starts a localhost-only browser UI on `127.0.0.1:8765` by default. It shows the same workflow board/list experience as the extension, with search, filters, document previews, corpus insights, lint/audit health, Mermaid rendering, auto-refresh, and an edit shortcut that opens the selected Markdown file in the system editor.

The topbar includes focused operational views:

| View | Purpose |
| --- | --- |
| Explorer | Read-only repository tree with bounded previews for text, images, directories, oversized files, and unsupported binary files. |
| Workshop | Local terminals and command runs. Terminals use the vendored xterm.js frontend; commands are discovered from `package.json` and `pyproject.toml` scripts and stream output over SSE. |
| Git | Repository status, changed files, and diffs for review-oriented inspection. |
| CI | Local/remote validation status surfaced for release and handoff checks. |
| CDX | Guarded assistant workflows for audits, release reviews, corpus planning, and pre-release preparation. |
| Settings | Viewer preferences, display controls, refresh behavior, and local UI state. |

Viewer preferences are stored locally in the browser profile. Auto-refresh
restores the interval chosen in the viewer unless the launch command explicitly
sets `--refresh-interval`, in which case that launch value controls only the
current session. The CDX status table has compact controls for column visibility
and provider filtering; `BLOCK` and `CR` are hidden by default, and provider
filtering defaults to all providers so newly discovered providers remain visible.
When workspace inspection is available, the topbar shows an `Explorer` view
before `Git`; it provides a read-only file tree and bounded previews for text,
directories, images, oversized files, and unsupported binary files.

The Workshop view is local-machine only. Terminal sessions and command runs are
created on the machine running `logics-manager view`, appear with running-count
badges in the topbar, and can be stopped from the UI. Terminal sessions are
cleaned up after the browser disconnects, while quick reloads can reattach
without leaving duplicate sessions behind.

For phone or tablet inspection on the same trusted network, launch with `--lan`:

```bash
logics-manager view --lan --open
```

LAN mode binds to `0.0.0.0`, computes a reachable local-network URL, and adds a
per-session bearer token for non-loopback requests. The browser receives a
shareable URL and, when the optional `segno` package is installed, a QR code.
LAN mode is still read-only at the HTTP layer; workflow mutations continue to go
through canonical CLI commands.

The CDX missions panel includes guarded workflows for audits, release reviews,
turning a free-form wish into a structured Logics request, preparing a corpus
plan, and preparing a guarded pre-release from an editable `vX.X.X` version.
For full-audit and release-review, the main write checkbox allows CDX to write
the mission corpus/report; direct repository fixes require the separate `Fix
directly` checkbox and skip the corpus/report artifact. Write-capable missions
must report changed files and validation evidence. The corpus-ready mission asks
CDX for allowed corpus actions first; the corpus is updated when those returned
actions are applied explicitly. The pre-release mission may update release
metadata and create the matching changelog, but must not tag, push, publish,
upload assets, or create a GitHub release.

Useful options:

```bash
logics-manager view --port 0 --open
logics-manager view --lan --port 0 --open
logics-manager view --host 127.0.0.1 --port 9876
logics-manager view --focus req_001_example --open
logics-manager view --focus logics/tasks/task_001_example.md --read --open
logics-manager view --no-open
```

Use `--port 0` when the default port is already taken. Direct Logics workflow mutations still route through canonical CLI commands such as `flow promote`, `flow finish`, `lint`, and `audit`; guided CDX missions may edit repository files only when the mission's file-write checkbox is enabled.

Focused viewer links can point directly at a corpus item:

```text
http://127.0.0.1:8765/?focus=logics/request/req_001_example.md
http://127.0.0.1:8765/?focus=logics/request/req_001_example.md&read=1
```

If the viewer server is not already running, start it with the equivalent fallback command:

```bash
logics-manager view --focus logics/request/req_001_example.md --open
logics-manager view --focus req_001_example --read --open
```

This is the recommended assistant handoff pattern: provide the local viewer link for an already-running viewer and the CLI fallback command for a stopped server. Focus targets accept workflow refs such as `req_001_example`, `item_001_example`, or `task_001_example`, plus repo-relative Logics Markdown paths. Traversal and non-Logics paths are rejected.

### CLI Contracts

Workflow target arguments accept these forms:

- a workflow ref, such as `req_001_example`, `item_001_example`, or `task_001_example`;
- a repo-relative Markdown path under the matching Logics directory, such as `logics/request/req_001_example.md`;
- an absolute path only when it resolves inside the current repository.

Mutation commands reject `..` traversal and files outside the repository before writing. Output paths passed with `--out` must also be repo-relative and remain inside the repository after resolution. Configured log/cache paths in `logics.yaml` may be repo-relative or absolute, but absolute paths must still resolve inside the current repository.

When a command supports `--format json`, stdout is a machine-readable JSON payload. Human-oriented status, diagnostics, and progress text should not be mixed into stdout for JSON mode. This makes JSON-mode commands safe to pipe into tools such as `jq` or consume from scripts.

`--json` is a shorthand for `--format json` on commands that support JSON output.

JSON-capable operator commands:

| Command | Purpose | JSON output |
| --- | --- | --- |
| `logics-manager status` | Summarize open workflow docs and next actions. | `--format json` or `--json` |
| `logics-manager health` | Show workflow health counts and issue signals. | `--format json` or `--json` |
| `logics-manager followups` | List follow-up areas with request creation commands. | `--format json` or `--json` |
| `logics-manager product-consistency` | Check product brief lineage links. | `--format json` or `--json` |
| `logics-manager search <query>` | Search workflow docs directly. | `--format json` or `--json` |
| `logics-manager index` | Regenerate `logics/INDEX.md`. | `--format json` or `--json` |
| `logics-manager lint` | Validate doc shape and changed-doc hygiene. | `--format json` or `--json` |
| `logics-manager audit` | Validate workflow traceability and governance. | `--format json` or `--json` |
| `logics-manager sync ...` | Read, list, search, repair, and export workflow state. | `--format json` or `--json` on supported subcommands |
| `logics-manager assist ...` | Build review, validation, context, and runtime summaries. | `--format json` or `--json` on supported subcommands |
| `logics-manager flow ...` | Create, promote, split, close, finish, and list docs. | `--format json` or `--json` on supported subcommands |

Operator triage flow:

```bash
logics-manager status --json
logics-manager health --json
logics-manager product-consistency --json
logics-manager followups --source-kind product --json
```

Use `status` first when you need the next work signal. Use `health` for corpus-level anomalies. Use `product-consistency --strict` in release checks when active product briefs must have valid lineage. Use `followups` for open actionable follow-up areas; add `--include-closed` only when auditing historical docs.

Multi-file workflow mutations such as `flow promote`, `flow split`, and `flow finish` validate their direct inputs before writing. New workflow docs are created with exclusive filesystem writes, so an ID collision fails instead of overwriting an existing file; rerun the command to allocate a fresh ID after reviewing `git status`/`git diff`. They still operate on Markdown files in the working tree rather than through a database or transaction service; if the filesystem fails mid-write, recover with git status/diff and rerun after cleanup.

To update the installed CLI later:

```bash
logics-manager self-update
```

For npm installs (recommended), update with:

```bash
npm install -g @grifhinz/logics-manager@latest
```

If `self-update` reports an externally managed Python environment on a
legacy `pip`/`pipx` install, the supported answer is to migrate to the
npm package above rather than to repair the Python install. The PyPI
artifact is still published, but `pipx` upgrades remain available only
for users who have not migrated yet:

```bash
# Legacy path, kept for compatibility (npm install is preferred):
pipx upgrade logics-manager
# Or rebuild the venv if pip blocked the install:
pipx install --force logics-manager
```

If npm reports a successful update but `logics-manager --version` still shows an older version, another installation is earlier on `PATH`. Diagnose it with:

```bash
type -a logics-manager
whence -a logics-manager  # zsh
pipx list
npm prefix -g
npm list -g @grifhinz/logics-manager --depth=0
"$(npm prefix -g)/bin/logics-manager" --version
```

If the direct npm binary shows the expected version, remove the older Python install or move the npm global `bin` directory earlier on `PATH`. In zsh, run `rehash` or open a new terminal after changing installs so the shell forgets any cached command location.

When installed with `pipx` from a local path, `self-update` reports that original
spec, for example `from spec '/path/to/logics-manager'`. That installation is
updated from the local working tree, not from the PyPI artifact. Use
`pipx uninstall logics-manager && pipx install logics-manager` when you want to
switch back to the published PyPI package.

## VS Code Extension

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

## MCP For Assistants

The MCP server is an assistant-facing adapter over the CLI. It is useful when a chat assistant should work with Logics documents without getting arbitrary filesystem or shell access.

The MCP surface can:

- create and promote workflow docs;
- read, list, search, and build context packs from approved Logics docs;
- update controlled indicators and append bounded notes;
- finish or close workflow docs through canonical commands;
- run lint, audit, deterministic repairs, split operations, and Logics-scoped diffs.

Inspect the exposed tools:

```bash
python3 -m logics_manager mcp tools
```

Run the local stdio server:

```bash
python3 -m logics_manager mcp serve --repo-root .
```

Run the local HTTP server for an HTTPS tunnel:

```bash
LOGICS_MCP_BEARER_TOKEN="$(openssl rand -hex 32)" python3 -m logics_manager mcp serve-http --repo-root . --host 127.0.0.1 --port 8765
```

`POST /mcp` accepts `Authorization: Bearer <token>` when `LOGICS_MCP_BEARER_TOKEN` or `--bearer-token` is set. Keep `/health` unauthenticated for smoke checks, but do not expose `/mcp` publicly without a bearer token.

Start the local server and a temporary `localtunnel` session in one command:

```bash
python3 -m logics_manager mcp tunnel --repo-root . --port 8765
```

For short-lived live debugging only, run without bearer auth:

```bash
python3 -m logics_manager mcp tunnel --repo-root . --port 8765 --no-bearer
```

During project development, the same commands can be run through the repository binary:

```bash
node scripts/npm/logics-manager.mjs mcp tunnel --repo-root . --port 8765
node scripts/npm/logics-manager.mjs mcp tunnel --repo-root . --port 8765 --no-bearer
```

Generate a local connector plan:

```bash
python3 -m logics_manager mcp connect --repo-root . --port 8765
```

With an HTTPS tunnel URL:

```bash
python3 -m logics_manager mcp connect --repo-root . --public-url https://example-tunnel.example --check
```

For a no-bearer plan:

```bash
python3 -m logics_manager mcp connect --repo-root . --public-url https://example-tunnel.example --no-bearer --check
```

The connector plan prints the bearer token when used, server command, tunnel target, assistant connector URL, auth mode, auth header, smoke checks, warnings, and cleanup steps.

## Security

See [SECURITY.md](SECURITY.md) for supported versions and vulnerability
reporting guidance. Do not publish suspected vulnerabilities in public issues
until they are triaged; use GitHub's private vulnerability reporting or a
private security advisory draft for this repository.

## Assistant Model

The project is local-first:

- each operator runs the CLI and MCP server against their own repository;
- remote chat assistants connect through a short-lived HTTPS tunnel when needed;
- coding agents consume prepared tasks and run validations in the repo;
- shared GPTs or assistant configs can carry instructions, but each user keeps their own local connector URL and token.

This avoids a hosted multi-tenant Logics service while still allowing ChatGPT, Claude, Codex, or another MCP-capable assistant to work against the same workflow contract.

## Onboarding Prompts

Use these as quick starting points when you want the plugin or the shared Logics flow to help frame work before execution.

### (1) Need

> Start a new request for this problem: `<describe the need or pain point>`
>
> Ask me any clarifying questions that would make the request stronger. Suggest helpful options if I need guidance.

### (2) Framing

> Generate backlog items for the new requests and split them into separate delivery slices.
>
> Ask me any questions that would increase your confidence or improve your understanding before you finalize the backlog.

### (3) Orchestration Tasks

> Create the orchestration tasks needed to execute the backlog slices, one bounded task per coherent delivery wave.
>
> If the slice is still broad, propose a split before you draft the tasks and ask any questions that would reduce ambiguity.

### (4) Execution

> Execute task `<task id or title>`. Commit after each wave, keep going until the work is done, and do not stop early.
>
> If you need to make assumptions, state them briefly and keep the task moving.

### What the docs are for

- If you think "here is the problem and context..." -> request
- If you think "this needs a scoped delivery slice..." -> item
- If you think "we want..." -> product brief
- If you think "we decided..." -> ADR
- If you think "the system should..." -> spec
- If you think "let's do..." -> task

Companion doc statuses are intentionally separate from workflow statuses:
product briefs use `Draft`, `Proposed`, `Active`, `Accepted`, `Validated`, `Rejected`,
`Superseded`, `Settled`, or `Archived`; ADRs use `Draft`, `Proposed`,
`Accepted`, `Validated`, `Rejected`, `Superseded`, `Settled`, or `Archived`.
Use `Settled` when the subject is closed, consumed by delivery, and no longer
needs active attention without implying that the document has been archived.

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
  - Git on PATH for workspace and repository repair flows.
  - `logics/` is bootstrapped automatically when needed.
  - The normal path uses the bundled runtime and `logics-manager`.
  - Python 3 on PATH for script-backed workflow actions. The extension accepts `python3`, `python`, `py -3`, or `py`.
- To build, package, or test the extension locally:
  - Node.js + npm.
- Optional CLI tooling:
  - VS Code CLI `code` on PATH for terminal-based VSIX install or `npm run dev`.

Windows notes:
- You do not need the `code` CLI for normal extension usage inside VS Code.
- If Python is installed through the Windows launcher, `py -3` is supported by the extension.
- Repository-managed text files are normalized through [`.gitattributes`](.gitattributes); let Git handle `CRLF`/`LF` conversion instead of rewriting line endings manually.

## Runtime Compatibility

- Canonical CLI and runtime contract: `logics-manager`
- The bundled runtime is the supported steady-state path for the extension.
- If the bundled runtime is missing or incompatible, create/promote actions fail with explicit error messaging in the extension.

### Runtime smoke checklist

- Create a request from UI (`New Request`) and confirm markdown is generated.
- Create a fixture request with `logics-manager flow new request --title "Smoke test"` and confirm the compact synthetic request shape is generated.
- Create a backlog item and a task from the UI and confirm markdown is generated.
- Open `Read` on a Mermaid-bearing doc and confirm the graph is rendered.
- Run `logics-manager view --port 0 --open`, confirm the browser viewer loads repository docs, then stop it with `Ctrl+C`.
- Promote request -> backlog and confirm links are updated.
- Confirm request/backlog/task generation fails fast if a Mermaid signature or traceability block is stale instead of waiting for audit to find it later.
- Promote backlog -> task and confirm task document is generated.
- Refresh board/details and confirm data remains consistent.

## VS Code Extension Installation

This section is only for installing the VS Code extension. For the core CLI, use the `Quick Start` section above.

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

## Deploy / Release (VSIX)

1. Bump the version in `package.json`, `pyproject.toml`, and root `VERSION` when preparing a release manually.
2. Curate the matching changelog entry in `changelogs/CHANGELOGS_X_Y_Z.md`.
3. Validate that the changelog matches the current package version:

```bash
npm run release:changelog:validate
```

4. Build and package:

```bash
npm run package
```

This creates `logics-manager-<version>.vsix` in the repo root.

5. Smoke-test the package locally:

```bash
npm run install:vsix
```

6. Distribute the `.vsix` and use the matching release notes when publishing.

If the current plugin version is already published, `logics-manager assist next-step` can now propose the next release step instead of stalling on an already-live tag.

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

## Validation

- Compile: `npm run compile`
- Lint TS: `npm run lint`
- Unit tests: `npm run test`
- Plugin coverage: `npm run test:coverage`
- VSIX package validation: `npm run package:ci`
- Logics docs lint: `npm run lint:logics`
- Logics workflow audit + docs lint: `npm run audit:logics`
- Strict Logics governance audit: `npm run audit:logics:strict`
- README metadata drift check: `npm run docs:check`
- Local browser viewer smoke: `logics-manager view --port 0 --open`
- Fast extension-focused local check: `npm run ci:fast`
- Full CI-equivalent local check: `npm run ci:check`
- Security audit policy gate: `npm run audit:ci`

`npm run audit:logics` uses the default active-work profile. It blocks correctness and traceability failures with a nonzero process exit, but reports early companion-doc polish such as missing overview Mermaid diagrams as warnings so drafting and agent handoffs can continue.

`npm run audit:logics:strict` uses the strict governance profile. Use it before release or governance review when companion docs must be complete and warning-class findings should be resolved. Strict governance findings are advisory to active implementation until you choose the strict command; the standard audit remains the mandatory day-to-day gate.

`logics-manager audit --format json` and `logics-manager lint --format json` expose `issue_count`, `warning_count`, `strict_count`, `finding_count`, `can_continue`, and `release_ready`. Agents should treat `issue_count > 0` or `can_continue: false` as blocking active work. Treat `release_ready: false` as a signal that cleanup remains before release-grade validation, not as a standard-audit process failure when there are warnings only.

`npm run ci:check` mirrors the blocking repository CI contract, including Logics strict-status lint, request auto-close sync verification, workflow audit, README badge drift detection, Python tests, CLI smoke checks, TypeScript validation, extension tests, local viewer smoke, and VSIX packaging.

`npm run audit:ci` enforces the repository audit policy locally. It runs `npm audit --json` against the configured npm registry, blocks new actionable vulnerabilities, and only allows the explicitly documented temporary exceptions tracked in the backlog. If the registry is unreachable, the command fails as `registry unavailable` rather than reporting a clean advisory state. `npm run package:ci` is local-only package validation and does not require registry access after dependencies are installed.

`npm run test:viewer-smoke` writes `artifacts/local-viewer-smoke/summary.json`. A localhost socket bind denial is recorded as an explicit skipped result. CI still has non-skipped coverage for the viewer path: Linux/macOS-capable environments exercise Chrome or the JSDOM fallback, while Windows CI runs a server/API smoke that proves the shell and `/api/items` path without launching a browser.

Oversized runtime, viewer, and test files are tracked through `logics/architecture/adr_020_split_the_oversized_plugin_and_workflow_surfaces_into_focused_modules.md`. The decomposition rule is correctness-first: extract pure helpers and API contracts before cosmetic file-size work, keep entrypoints thin, and cover each seam with targeted Python, Vitest, or smoke tests before moving on.

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
3. Clone the repo and run `npm ci`.
4. Run the automated baseline first: `npm run ci:check` and `python -m logics_manager lint`.
5. Smoke the real Windows-only paths:
   - install the `.vsix` from VS Code or with `code --install-extension ...`
   - trigger `Bootstrap Logics`
   - run `Logics: Check Environment`
   - run `logics-manager assist runtime-status --format json` and confirm `windows_safe_entrypoint` still points to `python -m logics_manager flow assist ...`
   - run `logics-manager assist diff-risk --backend auto --format json` and `logics-manager assist validation-checklist --format json`
   - confirm those shared-runtime commands still work without relying on any repo-local Codex overlay path
   - create a request, backlog item, and task
   - promote request -> backlog and backlog -> task
   - confirm `py -3` or `python` launcher resolution works as expected
6. Use the VM for release preparation and any bug that smells like shell quoting, PATH resolution, case-insensitive paths, symlink restrictions, or extension-host behavior. Do not treat macOS-only local simulation as a full Windows substitute.

## Closing Logics Work

Do not mark a Logics task as `Done` by editing markdown indicators manually.
Use the canonical `logics-manager` guarded finish command so closure propagates correctly from task -> backlog -> request and the linked chain is verified.

```bash
npm run logics:finish:task -- logics/tasks/task_020_orchestration_delivery_for_req_019_req_020_and_req_021.md
```

This uses the runtime-native command:
- `logics-manager flow finish task ...`

If you want a full repository-wide check afterward, run:
- `npm run audit:logics`

If you edit statuses by hand, the docs can look valid while the request/backlog chain is left out of sync.

For multi-wave delivery work, prefer coherent checkpoints:
- update the linked Logics docs during the wave that changes the behavior;
- leave the repo in a commit-ready state at the end of the wave;
- then create the reviewed commit checkpoint instead of batching several undocumented partial states.

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
- Companion docs should still mirror those links under `# References` with canonical relative paths so the runtime and plugin stay aligned.
- Legacy nested list blocks (`- References:` / `- Used by:`) are also parsed for backward compatibility.
