[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# Core CLI

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
logics-manager flow start task_001_example
logics-manager flow progress task task_001_example --progress 40%
logics-manager flow finish task task_001_example
logics-manager sync read-doc req_001_example --max-chars 6000
logics-manager sync context-pack req_001_example task_001_example --format json
logics-manager sync refresh-mermaid-signatures task_001_example
logics-manager flow closeout task_001_example --validation-command "pytest tests" --validation-result passed --lint --audit
logics-manager view --open
logics-manager view --focus req_001_example --read --open
```

## Agent workflow cookbook

For bounded workflow inspection, prefer `logics-manager flow show <ref>` or
`logics-manager sync read-doc <ref>` before reading Markdown directly. Both
commands include useful body content in text mode and keep JSON output available
with `--format json`.

For linked context, use `logics-manager sync context-pack <refs...>` with a
small set of request, backlog, or task refs. The command deduplicates each
ref's direct neighborhood and supports `--mode diff-first` when recent changes
matter.

Workflow Mermaid blocks in request, backlog, and task docs are optional legacy
presentation. The source of truth is the structured Markdown: indicators,
lineage links, acceptance criteria, validation records, and `# Links` sections.
For generated relationship views, use `logics-manager sync export-graph` or the
viewer instead of maintaining diagrams by hand.

For targeted legacy hygiene, use
`logics-manager sync refresh-mermaid-signatures <refs-or-paths...>` or
`--changed-only` to refresh signatures only when Mermaid blocks already exist;
the command skips Mermaid-free workflow docs. For end-of-delivery cleanup, use
`logics-manager flow closeout <task>` with validation evidence plus `--lint
--audit` when you want the command to run the gates before reporting.

## Bundled agent skills

`logics-manager` ships reusable agent skills (Claude Code and Codex share the
`skills/<name>/SKILL.md` format). The bundled `/corpus` skill encodes the full
scaffold flow: request → product brief → backlog → orchestration task →
context pack, with validation and commit steps.

```bash
logics-manager skills list
logics-manager skills install                 # into ~/.claude/skills
logics-manager skills install --target-dir ~/.codex/skills
logics-manager skills install --all-profiles  # every detected harness dir
```

`--all-profiles` detects `~/.claude/skills`, `~/.codex/skills`, and every cdx
profile home (Claude Code profiles via `claude-home/`, Codex profiles via
`config.toml`). Skills are install-once per harness home, independent of
projects and Python environments. After updating the package, re-run with
`--force` to refresh installed copies.

## Obsidian projection

The default Logics corpus stays plain canonical Markdown. No frontmatter is
written unless a repository explicitly opts in with `obsidian.enabled: true` in
`logics.yaml`.

When enabled, the Obsidian projection is a derived view over the canonical
blockquote indicators:

```yaml
obsidian:
  enabled: true
```

```bash
logics-manager obsidian sync
logics-manager obsidian sync --check
logics-manager obsidian clean
```

`obsidian sync` writes deterministic YAML frontmatter above supported Logics
docs with `type`, `ref`, `status`, `understanding`, `confidence`, optional
`progress` / `theme`, a title alias, and tags derived from type, status, and
theme. Re-running the command is idempotent.

`obsidian sync --check` reports projection drift for CI without writing files.
`obsidian clean` removes only the managed `logics_projection: obsidian`
frontmatter block and restores the canonical Markdown body byte-for-byte.
Logics Manager parsing, linting, audit, flow transitions, and index generation
continue to treat the blockquote indicators as authoritative; frontmatter is
never required to parse a document. The normal linter reports a blocking issue
when committed Obsidian frontmatter drifts from canonical type/ref/status/title
metadata.

## Local Browser Viewer

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

Projects may adopt the optional project-owned i18n contract:

```bash
logics-manager i18n status
logics-manager i18n init --source-locale fr
logics-manager i18n plan
logics-manager i18n lint
logics-manager i18n validate
```

See [Project i18n contract](i18n.md) for the complete source-only, existing
catalog, locale-addition, CI, and compatibility-migration workflows.

The contract lives at `logics/i18n/contract.json`. A new UI project may begin
with one source-locale JSON catalog; multiple translations are not required at
initialization. Repositories without a contract remain valid and receive
advisory guidance. Once adopted, validation checks repository-contained catalog
paths, semantic key segments, string and non-empty leaves, exact locale parity,
and named placeholder parity. Projects without user-facing copy may initialize
the contract with `i18n init --not-applicable --reason "..."`.

The **Workshop** menu adds a separated project-tools section when the selected
repository uses a supported project convention:

- **Translations** recognizes two or more locale-named JSON files (`en.json`,
  `fr-FR.json`, and similar) under `src/i18n`, `src/locales`, `locales`, or
  `messages`. It aligns nested keys, reports missing, extra, and empty values,
  supports search, and can edit existing string values.
- **Theme** recognizes CSS custom properties in `src/theme.css`,
  `src/styles.css`, `styles/theme.css`, `app/globals.css`, or `src/app.css`. It
  groups tokens into colors, typography, spacing, radii, shadows, and other
  values, provides isolated previews, and can edit existing declaration values.

The viewer prefers a valid project-owned i18n contract. Legacy repositories can
still choose sources explicitly with a repo-root `.logics-viewer.json` file:

```json
{
  "i18n": { "directory": "src/i18n", "sourceLocale": "en" },
  "theme": { "path": "src/styles.css" }
}
```

Translation dictionaries and theme modes defined in JavaScript or TypeScript
are detected when they use conventional `src/i18n.*` or `src/theme.*` paths,
but remain read-only because rewriting executable source is intentionally out of
scope. Project-tool reads are bounded to repository files of at most 1 MB, 20
locales, and 10,000 translation keys. Writes accept a logical locale/key or
selector/property pair rather than an arbitrary path, require the viewer's
existing mutation authorization, reject stale revisions, validate the new value,
and atomically replace only the detected source file.

For remote status, the viewer detects GitHub and GitLab remotes from
`git remote -v`. GitHub Actions status uses `gh`; GitLab CI status uses `glab`
against the configured GitLab host when a `.gitlab-ci.yml` or
`.gitlab-ci.yaml` file is present.

Viewer preferences are stored locally in the browser profile. Auto-refresh
restores the interval chosen in the viewer unless the launch command explicitly
sets `--refresh-interval`, in which case that launch value controls only the
current session. The CDX status table has compact controls for column visibility, provider
filtering, and account management. `BLOCK` and `CR` are hidden by default, and
provider filtering defaults to all providers so newly discovered providers remain
visible. An **ON/OFF** toggle column lets you enable or disable any CDX session
directly from the table without leaving the viewer; the change takes effect
immediately via `cdx enable` / `cdx disable` on the host.

Two additional controls sit next to the configure and filter icons:

- **Import (↑)** — select a `.cdx` export file, enter the optional passphrase,
  and choose whether to merge with existing accounts or replace them. The file
  is decoded client-side and sent to the local viewer server, which calls
  `cdx import --merge` (or without `--merge`) with the passphrase passed
  exclusively through an environment variable — it never appears in any command
  line or log.
- **Export (↓)** — choose which enabled sessions to include (disabled accounts
  are excluded from the list automatically), supply an optional passphrase to
  encrypt the bundle, and tick whether credentials should be embedded
  (`--include-auth`). The server calls `cdx export` into a temporary file,
  returns the bundle to the browser, and the browser triggers an automatic
  download named `cdx-accounts.cdx`. Temporary files are cleaned up immediately
  after each operation.
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

### Phone-friendly write access (`--lan-rw` + `--tls`)

To actually use Workshop terminals or run actions from a phone on the same
network, opt-in to read/write mode with `--lan-rw` and serve over HTTPS:

```bash
logics-manager view --lan --lan-rw --tls --open
```

- `--tls` generates a self-signed certificate under
  `~/.cache/logics-manager/tls/` on first launch (delegated to the `openssl`
  binary). The SAN covers loopback plus the detected LAN IP, so iOS/Android
  accept the cert after a one-time trust prompt. Pass `--tls-cert PATH
  --tls-key PATH` to supply your own pair instead.
- `--lan-rw` enables a PIN-based pairing handshake. When a device clicks
  "Pair this device" in the LAN banner, the host prints a 6-digit PIN on
  stdout. Type the PIN on the device and it receives a per-device bearer
  token persisted as a SHA-256 hash under
  `~/.cache/logics-manager/devices.json`. Cleartext is only sent to the
  device once; revoke a lost device via the device list or by deleting its
  entry from the JSON file.
- Cross-origin POSTs are refused (CSRF). Mutating endpoints require a
  loopback client *or* a request whose bearer token matches a paired device.

Without `--tls`, `--lan-rw` works but the boot banner warns that device
tokens transit in cleartext. Either add `--tls` or wrap the viewer in a
Tailscale / WireGuard / VPN tunnel before pairing real devices.

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

## CLI Contracts

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
logics-manager update
```

`logics-manager self-update` remains available as the legacy alias for the same
update workflow.

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

## Closing Logics Work

Do not mark a Logics task as `Done` by editing markdown indicators manually.
Use the canonical `logics-manager` guarded finish command so closure propagates correctly from task -> backlog -> request and the linked chain is verified.

During multi-wave task work, use `logics-manager flow progress task ... --progress <n>%` instead of editing `Progress` by hand. The command updates the task and recalculates linked backlog item progress from linked tasks.

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

This follows ADR 009: tooling should guide commit-ready checkpoints, not auto-commit or require one commit for every micro-step.

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
