# Logics Manager 2.21.3

Commands that reported a failure and exited zero now exit non-zero, generated
documents pass the checks they are generated for, `doctor` stops calling a single
install a duplicate of itself, and the release notes finally reach the package.

## Behavior change: `flow` derives its exit status from the payload

`logics-manager flow` returned `1` only when the subcommand was literally
`closeout` or `validate-closeout`. Every other handler's verdict was ignored, so
`flow validate` reported blocking findings and exited `0`, and
`flow roadmap validate` printed `FAILED` and exited `0`. Eight payload sites in
that module compute an `ok` field from a real condition; six of them could never
reach the exit code.

The dispatcher now reads `payload["ok"]`. A subcommand that publishes no verdict
still exits `0`, so a validator added later is honest without anyone remembering
to extend a list.

```bash
logics-manager flow validate req_001_example
# Flow validate: found 2 finding(s).
# - blocking: request has ACs but no linked backlog items
echo $?
# 1
```

**Any `flow` subcommand publishing `ok: false` now exits non-zero, not only the
two named above.** A caller that ran a `flow` command for its side effects and
read the payload will now see a non-zero status. Read the `ok` field, or ignore
the status explicitly.

This is the same correction 2.20.0 made for `health`.

## Behavior change: `doctor` exits non-zero when it reports FAILED

`logics-manager doctor` printed `Logics doctor: FAILED`, listed its issues, and
exited `0`. Its own `doctor packaging` sibling, fifteen lines above it in the
same function, already returned `0 if payload["ok"] else 1`.

The 2.20.0 note for `health` said the new behavior was "what every other command
already did". That was not true when it was written: `doctor`, the headline
diagnostic, was the counter-example.

**A pipeline that runs `logics-manager doctor` and trusts its exit status will
now see failures it previously missed.**

## The corpus carries a schema version, and CI checks it

`doctor` had been failing on this repository's own corpus -- 308 of 1322 workflow
documents predated the schema-version indicator -- while the pipeline stayed
green, because CI only ran `doctor packaging --metadata-only`.

`sync schema-status --apply` writes the missing indicator, with `--dry-run` to
preview, so any repository adopting Logics after the fact can close the same gap
in one command. The full `doctor` now runs in CI.

## Generated documents pass the checks they are generated for

`flow roadmap propose` formatted whatever ref was typed, and only the full slug
matches the pattern the audit reads, so `--request-ref req_296` produced a
roadmap the audit rejected as linked to nothing. Refs resolve to their full slug
before anything is written -- request, backlog, task and product alike -- and an
unresolvable ref fails naming itself instead of landing on the page.

`logics index` reassigned the document ref and title on every `## ` line, so a
document was indexed under its last section rather than its heading. Only the
first heading is the heading now. This corrected 35 rows in `logics/INDEX.md`:
architecture decisions had been listed as "10. Responsive fallback",
"`show_git_diff`", and "Phase 2.1 (shipped under `task_222`, 2026-06-15)".

`flow promote` copied only the first physical line of a wrapped acceptance
criterion, so promoting a request whose criteria run to prose produced backlog
items and tasks asserting half a sentence. A wrapped bullet is carried whole.

## `doctor` stops reporting a single install as a duplicate

On an npm install the PATH entry is the Node wrapper and the running process is
the Python entry it spawns. Comparing those two files reported the one install as
a shadow of itself, permanently, on every npm machine -- and the remediation text
advised uninstalling the user's only copy.

Installs are compared by the package directory that owns them. On Windows, where
the PATH entry is a `%APPDATA%\npm\logics-manager.cmd` launcher that lives
nowhere near the package, the launcher is read and followed to the entry it runs.
Two genuine installs are still reported.

## A changelog in the package

`CHANGELOG.md` is generated from the curated notes under `changelogs/` by
`npm run build:changelog`, ships in the npm package, and CI fails on a stale
aggregate. `pyproject.toml` gained `readme`, without which the PyPI page carried
no description at all.

## Security

The nine standing code-scanning alerts are resolved. Three were removed by
changing the code: the viewer's diagnostics session id no longer falls back to
`Math.random()`, and a test asserts a substring instead of matching a regex
CodeQL read as an HTML tag filter. The six Python alerts were reviewed
individually and dismissed, each with a comment naming the guard that makes its
site safe -- argv lists with no `shell=True`, and `realpath` plus repo-root
containment plus a family allow-list plus a `.md` suffix.

## Validation

- 1270 pytest, 834 vitest, tsc, eslint, line budget, function-length ceiling,
  corpus lint, audit and doctor, on macOS.
- Windows 10 build 26200 with Python 3.10, identical archive scope for both runs:
  the pre-change baseline gave 4 failed / 1227 passed and this release gives the
  same 4 failed / 1257 passed. The four are environmental -- viewer assets are
  generated by `npm run build:assets` and that host has no Node.
