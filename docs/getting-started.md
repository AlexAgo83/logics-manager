[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# Getting started

## Install

The recommended install path is the **npm package**. It bundles the CLI runtime in a
self-contained launcher that works the same on macOS, Linux, and Windows / WSL:

```bash
npm install -g @grifhinz/logics-manager
logics-manager --help
```

Install the CLI from this repository when developing locally:

```bash
python3.11 -m pip install .
logics-manager --help
```

For the VS Code extension, see [vscode.md](./vscode.md).

### Python install paths (legacy, not recommended)

> **Deprecated.** `pip` and `pipx` installs are still published for backwards
> compatibility, but they are no longer the supported path: they break on PEP 668
> distros, on WSL (slow `/mnt/<drive>` IO and `gio` opener failures), and on Python
> interpreters that diverge from the build matrix. Prefer the npm install above. The PyPI
> release will keep shipping; we only stop recommending it for end users.

```bash
python3.11 -m pip install logics-manager
pipx install logics-manager
```

Reach for npm if you hit PEP 668 or externally-managed Python errors.

## First steps

Initialize or check a repository:

```bash
logics-manager bootstrap --check
```

`bootstrap` writes the `logics/` tree and the managed section of `AGENTS.md`/`LOGICS.md`;
the only things it removes are the bridge files older versions generated
(`.claude/commands/logics-*.md`, `.claude/agents/logics-*.md`, `logics/skills/`). Your own
`.claude/` settings and files are untouched; see [cli.md](./cli.md) for the full list.

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

Open the board with `logics-manager view` (see [the viewer](./viewer.md)), and give your
assistant the [onboarding prompts](./onboarding.md) or the [MCP server](./mcp.md).

## Obsidian-friendly Markdown usage

Logics docs are plain Markdown, so you can open either the repository root or the
`logics/` directory as an Obsidian vault for reading, search, backlinks, and graph
navigation. The local `.obsidian/` workspace directory is ignored by Git, so vault layout,
plugin choices, and workspace state stay local to each user.

Recommended setup:

- Open the full repository when you want README, source files, and Logics docs in one vault.
- Open `logics/` when you want a focused workflow-document vault.
- Use Obsidian for navigation, review, notes, and light Markdown edits.
- Use `logics-manager flow ...` for lifecycle changes such as create, promote, closeout,
  finish, and status transitions.

Safe editing rules:

- Do not hand-edit Logics indicators such as `Status`, `Progress`, `Understanding`,
  `Confidence`, lineage links, Mermaid signatures, or generated done/closeout evidence.
- Keep canonical Logics references as repo-relative paths or refs. `obsidian sync` adds
  `[[wikilink]]` navigation hints as a derived, opt-in projection: Logics Manager parsing
  never requires them, and canonical files under `logics/` are never rewritten by hand
  from this.
- Frontmatter, tags, and aliases are not written to canonical files; they only ever exist
  in the opt-in projection, generated deterministically and non-destructively, and
  validated against the canonical Logics doc type, ref, status, and title.

After editing workflow docs in Obsidian, validate from the repository root:

```bash
logics-manager lint --require-status
logics-manager audit --group-by-doc
```
