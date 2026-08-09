# logics-manager

[![CI](https://github.com/AlexAgo83/logics-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexAgo83/logics-manager/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/AlexAgo83/logics-manager)](LICENSE)
![Version](https://img.shields.io/badge/version-v2.21.0-4C8BF5)
![VS Code](https://img.shields.io/badge/VS%20Code-1.86.0-007ACC?logo=visualstudiocode&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4.1.2-6E9F18?logo=vitest&logoColor=white)

`logics-manager` is a local workflow runtime for projects that keep their delivery memory in Markdown.

The core product is the CLI. It creates, promotes, validates, audits, and closes the `logics/*` documents that describe work:

```text
request -> backlog item -> task -> implementation
```

Everything else in this repository is a client around that runtime:

- the VS Code extension embeds the same local viewer inside VS Code;
- the MCP server gives assistants a bounded tool API over the same CLI;
- the npm package and Python package are distribution paths for the same runtime.

The source of truth stays in your repository. Logics documents are plain Markdown, versioned with git, readable in reviews, and reusable by humans or AI assistants across sessions.

## What It Solves

AI-heavy projects often lose context between chats, agents, and implementation passes. Logics turns that context into durable project artifacts:

- `request`: the problem, need, and acceptance criteria;
- `backlog item`: a scoped delivery slice;
- `task`: executable implementation work;
- `product brief`: product framing and intent;
- `roadmap`: versioned long-term plan such as `0.1 -> 0.2 -> 1.0`;
- `ADR`: architectural decisions;
- `spec`: behavioral contract.

The result is a repo-local memory layer that reduces re-explaining, keeps implementation grounded, and gives every assistant or human the same inspectable workflow state.

## Product Shape

`logics-manager` has one core and several integrations:

| Layer | Purpose |
| --- | --- |
| CLI runtime | Canonical workflow engine for creating, promoting, auditing, repairing, and closing Logics docs. |
| VS Code extension | VS Code host for the canonical local viewer, with editor lifecycle and focus commands. |
| MCP server | Assistant-facing adapter that exposes bounded Logics tools without giving agents a shell. |
| Bundled agent skills | Reusable skills (`/corpus`, `/groom-issues`, `/implement-task`, `/review-project`) installed into Claude Code / Codex homes via `logics-manager skills install`. See [docs/cli.md](docs/cli.md#bundled-agent-skills). |
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

Create a longer-term plan when the work spans several versions:

```bash
logics-manager flow roadmap propose --title "Improve onboarding" --milestone "0.1: MVP" --milestone "0.2: Guided setup"
```

Validate the workflow corpus:

```bash
logics-manager lint --require-status
logics-manager audit
```

### Obsidian-friendly Markdown usage

Logics docs are plain Markdown, so you can open either the repository root or
the `logics/` directory as an Obsidian vault for reading, search, backlinks, and
graph navigation. The local `.obsidian/` workspace directory is ignored by Git,
so vault layout, plugin choices, and workspace state stay local to each user.

Recommended setup:

- Open the full repository when you want README, source files, and Logics docs
  in one vault.
- Open `logics/` when you want a focused workflow-document vault.
- Use Obsidian for navigation, review, notes, and light Markdown edits.
- Use `logics-manager flow ...` for lifecycle changes such as create, promote,
  closeout, finish, and status transitions.

Safe editing rules:

- Do not hand-edit Logics indicators such as `Status`, `Progress`,
  `Understanding`, `Confidence`, lineage links, Mermaid signatures, or generated
  done/closeout evidence.
- Keep canonical Logics references as repo-relative paths or refs. Obsidian
  wikilinks may be added later only as supplemental navigation hints; Logics
  Manager parsing must not require them.
- Frontmatter, tags, or aliases are not required today. If a future
  Obsidian-friendly mode generates them, they must be deterministic,
  non-destructive, and validated against the canonical Logics doc type, ref,
  status, and title.

After editing workflow docs in Obsidian, validate from the repository root:

```bash
logics-manager lint --require-status
logics-manager audit --group-by-doc
```

## Documentation

Full documentation lives in [`docs/`](docs/README.md), split by surface so each
topic stays readable on its own. GitHub renders every page and the links below
are clickable.

| Topic | What's inside |
| --- | --- |
| [Core CLI](docs/cli.md) | Commands, agent cookbook, local browser viewer, CLI contracts, closing work, notes. |
| [Project i18n contract](docs/i18n.md) | Optional source-only and multi-locale catalog governance, validation, viewer integration, and migration. |
| [VS Code Extension](docs/vscode.md) | Features, installation, development from source, command palette. |
| [MCP For Assistants](docs/mcp.md) | Assistant-facing tool surface, connector plans, assistant model. |
| [Onboarding Prompts](docs/onboarding.md) | Starting-point prompts for need, framing, orchestration, execution. |
| [Development & Validation](docs/development.md) | Requirements, runtime compatibility, validation commands, Windows validation, accessibility. |
| [Deploy / Release (VSIX)](docs/release.md) | Versioning, changelog validation, packaging, release steps. |

A short tour of each surface:

- The **CLI** is the canonical workflow engine. It creates requests, backlog
  items, tasks, product briefs, roadmaps, and ADRs; promotes and splits them; closes work
  with consistency checks; lints and audits traceability; exports indexes,
  context packs, and graph data; and serves both the local browser viewer and
  the bounded MCP tool surface. It also builds prompt packs for external image
  generators with `design prompt`, per asset kind, so a sheet and a single hero
  image never receive the same instructions. See [docs/cli.md](docs/cli.md).
- The **VS Code extension** hosts the same local viewer inside VS Code and keeps
  editor-specific commands limited to viewer lifecycle and focus shortcuts. See
  [docs/vscode.md](docs/vscode.md).
- The **MCP server** gives assistants a bounded tool API over the same CLI
  without arbitrary filesystem or shell access. See [docs/mcp.md](docs/mcp.md).

## Security

See [SECURITY.md](SECURITY.md) for supported versions and vulnerability
reporting guidance. Do not publish suspected vulnerabilities in public issues
until they are triaged; use GitHub's private vulnerability reporting or a
private security advisory draft for this repository.
