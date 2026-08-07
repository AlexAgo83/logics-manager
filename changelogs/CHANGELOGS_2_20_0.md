# Logics Manager 2.20.0

## Behavior change: `health` now exits non-zero when it reports a problem

`logics-manager health` used to exit `0` even while reporting `ok: false`, so
its exit status and its own verdict disagreed and a caller had to parse the
payload to notice anything. It now exits `1` when `ok` is false, which is what
every other command already did.

**If a pipeline runs `logics-manager health` for its side effects and ignores
the findings, it will now see a non-zero exit.** Read the `ok` field, or ignore
the status explicitly.

## Target any repository, from anywhere

Every command accepts `--repo-root DIR`, in any position, and operates on that
repository regardless of the working directory. Previously only the `mcp`
subcommands did, so an external orchestrator had to spawn each invocation with a
changed directory — and interpolate repository paths into shell command strings,
which breaks on paths containing spaces.

```bash
logics-manager status --repo-root /path/to/project
logics-manager flow new request --repo-root "/path/with spaces" --title "..."
```

## Report across every repository under a root

```bash
logics-manager fleet status --root ~/projects
logics-manager fleet health --root ~/projects --format json
```

Discovery is a directory listing — any immediate child holding a `logics/`
directory counts — so there is no registry to keep in sync. A repository that
fails is reported inline under its own key while the rest still report.

## Bound the MCP tool surface

Every MCP tool now carries a capability: `read-only`, `mutating`, or
`destructive`. `mcp serve`, `serve-http`, `tools`, and `call` accept
`--profile read-only|curated|full`, plus `--allow-tools` and `--deny-tools`
patterns, with deny taking precedence.

```bash
logics-manager mcp serve --profile read-only
logics-manager mcp serve --deny-tools 'delete_*,rename_*'
```

Serving all 36 tools or none was previously the only choice, destructive ones
included. The default remains the full surface, unchanged.

## Preview any mutation

Every mutating MCP tool accepts `dry_run` and returns one shape: `summary`,
`planned_paths`, `planned_refs`. Eight tools previously applied immediately with
no preview available, with no principle distinguishing them from the rest.

## Pass tool arguments without shell quoting

`mcp call` accepts `--arguments @file`, `--arguments @-` (stdin), and repeatable
`--arg KEY=VALUE` pairs alongside the inline JSON string. Under `--format json`,
failures now return JSON too, and the exit code follows the `ok` flag.

## Document age and stale work

`sync list-docs` and `sync read-doc` report `updated_at` and `age_days`, dated
from the document's most recent commit rather than filesystem mtime — the latter
gives every file one identical date after a fresh clone. `health` reports
`stale_docs` for open documents past a threshold, configurable as
`health.stale_after_days` in `logics.yaml` (default 14).

The CLI, the browser viewer, and the VS Code insights panel now derive both from
the same source. The panel previously applied its own hardcoded 30-day threshold
over mtime, so the same document could be stale in one surface and current in
another.

## The viewer sees the workflow health report

`/api/health` serves the workflow health report, and the Validation health
screen shows blocked documents, backlog items without a task, and stale
documents alongside the existing lint and audit findings. The screen was built
from validation findings alone, so none of those were visible.

Opening the project switcher now loads each project's open-work count, issue
signals, and stale count, so "where is work blocked" is answered without
switching into each project in turn. The scan runs on demand and is cached.

## Self-update acts on the copy that is running

`update` resolves the package manager from the running executable — a
`pipx/venvs/` path, an npm package directory, or a `site-packages` install —
instead of inferring it from packaging heuristics, which twice resolved a
package-manager-installed copy to a different manager and left a second
executable shadowing the first on `PATH`.

`update --check --format json` reports `manager`, `path`, `current_version`,
`latest_version`, `updated`, and any `shadowing_executables`, so an automated
updater no longer matches on the phrase "already at latest version". `doctor`
reports duplicate executables under `environment_warnings`, and the viewer shows
them in its update banner.

## Four bundled agent skills

`logics-manager skills install` now ships `/groom-issues`, `/implement-task`,
and `/review-project` alongside `/corpus`. They depend only on this project's
own command surface, so they update with the package.

## Fixes

- Eleven commands rejected their own `--help` with a usage error: `status`,
  `health`, `lint`, `doctor`, `index`, `followups`, `search`, `bootstrap`,
  `update`, `self-update`, and `product-consistency`. Fixed at the shared parser
  construction point, with a test that enumerates the command surface from the
  CLI's own registration.
- `update --help` errored instead of printing usage.
- `doctor packaging` demanded a `pyproject.toml` packages entry for asset
  directories whose names are not valid Python identifiers, which can never be
  importable packages.

## Security

- `--lan-rw` and `SECURITY.md` now state what network writes actually grant: a
  paired device can run commands under the account the viewer runs as, because
  the workshop terminal takes its command from the request body. The guarding
  mechanism — origin check, per-launch bearer, per-device token via a
  single-use PIN, and a 403 without `--lan-rw` — is unchanged. Only the wording
  was wrong: it described the capability as write access.
- `js-yaml` override raised to `4.3.1`, past CVE-2026-59870. `npm audit` reports
  no blocking findings under the project policy.

## Internal

- Python linting (`ruff`) and a 120-line function ceiling now run in CI, with
  existing violations recorded in an explicit ledger.
- Python coverage is measured in CI at 76% against a 75% floor. It was
  previously installed but never invoked.
- The session cockpit and workshop routes moved out of `viewer.py` into their
  own modules; its POST handler went from 493 to 215 lines.
- A test detects divergence between the document models rather than merging
  them.

## Validation

- `node scripts/ci-check.mjs`: 23/23 steps green.
- 990 Python tests, 760 TypeScript tests.
- Logics lint OK, workflow audit 0 issues across 1214 documents.
