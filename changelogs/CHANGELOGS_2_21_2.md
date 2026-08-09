# Logics Manager 2.21.2

Full-lifecycle skill coverage packaged as a Claude Code plugin, an Obsidian graph
projection with real edges, a bounded chain-graph view in the browser viewer, a
front-loaded AI Context section with a repair path, one viewer per repo, and five
fixes from a whole-repo review.

## Bundled skills now cover the full Logics lifecycle, and install as a Claude Code plugin

Four new skills close the gap between the existing scope-build-review happy path and
the rest of the CLI surface: `lifecycle-ops` (split/promote/withdraw/close/finish/
progress), `roadmap-deliver` (roadmap propose/show/validate, deliver), `closeout-repair`
(a troubleshooting decision path from `validate-closeout` finding to exact repair
command), and `project-health` (read-only doctor/health/audit diagnostics, explicitly
scoped apart from `review-project`'s capture step). All eight bundled skills (four new,
four existing, including `corpus`, which had no automated coverage before) are now
covered by one generalized test suite.

The repository ships a `.claude-plugin/plugin.json` manifest, verified with a live
install check that spawns the declared MCP server command and confirms `tools/list`.
The MCP surface gained 9 tools with no prior equivalent (withdraw, progress, roadmap
show/validate, deliver, validate-closeout, repair gates, repair links, doctor).

`logics-manager skills install --all-profiles` now detects drift by content, not just
directory existence: a skill whose bundled content changed since the last install is
refreshed, one you hand-modified is left alone and reported, and `update` (`self-update`
is now a deprecated alias, with its own notice) re-runs this sync automatically across
every detected harness. Hermes and Antigravity join Claude Code and Codex as detected
harnesses — Antigravity's real skills directory was verified against an actual install:
none of three previously-documented candidates were correct; it only discovers skills
inside a registered plugin (`~/.gemini/config/plugins/<name>/skills/`, next to that
plugin's own manifest, which `skills install` now writes automatically). `bootstrap
--sync-harnesses` (opt-in) wires skills and each harness's MCP config in one pass.

## Obsidian projection generates real wikilinks, not isolated nodes

`obsidian sync` used to copy each doc's body verbatim, so backtick-quoted refs never
became `[[wikilink]]`s and every synced doc landed as an isolated node in Obsidian's
graph view. The projection now links a ref only when it resolves to a real doc — proven
against the exact false-edge case that motivated this: a ref mentioned only as a prose
example in another doc's Context section must never become a link.

## A bounded chain-graph view in the browser viewer

A "Graph" action on an open request/backlog/task document renders that request's whole
chain (product brief, backlog items, tasks) as a Mermaid flowchart, with click-to-open.
The resolver reads only each doc's own structural `# Backlog`/`# Links` sections — never
a full-text ref scan, which would otherwise produce the same false-edge risk that
motivated the Obsidian fix above; proven live against this repo's own corpus.

## AI Context moved ahead of the truncation boundary

The one section written specifically to help an agent decide fast whether a doc is
relevant was placed near the end of every doc template — exactly where a bounded read
(`flow show`, `read_logics_doc`) is least likely to reach. New docs write it right after
the indicator block; existing docs get a deterministic, idempotent repair via the
autofix-structure path already used by `flow validate --apply-fixes` and `audit
--autofix-structure`, now also reachable from the viewer's health screen (an "Apply
fixes" button, reusing the same repair with no new logic).

## One viewer per repo, with a resolved port story

Two logics-manager processes for the same repo used to bind two different ports with no
coordination. A per-repo cross-process registry (`fcntl.flock`-based atomic claim) now
reuses an already-running viewer for that repo instead of starting a second one, and a
genuine port collision reports a clear error instead of an unhandled crash. The VS Code
extension's `deactivate()` now stops its tracked viewer server directly rather than
relying only on subscription disposal.

## Five fixes from a whole-repo review

- **Path-escape guards, consolidated.** Four independently-implemented containment
  checks (`mcp.py`, `viewer.py`, `viewer_git.py`, `viewer_project_tools.py`), each at a
  different level of strictness, now share two primitives in `path_utils.py`. The
  strictest existing behavior — rejecting a symlink even when it points back inside the
  repo — now applies uniformly at all four call sites, not only the one that used to
  catch it.
- **Two mechanical extractions.** `mcp.py`'s `TOOL_DEFINITIONS` (a pure schema literal)
  and `flow/__init__.py`'s 24 `--help` text builders each moved to their own module,
  verified byte-for-byte identical before and after.
- **The Python coverage floor stopped lying.** `--fail-under=75` carried a comment
  admitting the number was set below the measured value "so the build does not start
  red." It is now a real ratchet — fails below the floor, reports (never silently
  accepts) a run above it — modeled on the line-budget guard's own pattern.
- **`package-lock.json` drift, fixed and now caught.** Its version had fallen one patch
  behind `package.json` after a release with nobody noticing. It is regenerated and now
  joins the same version-source cross-check every other version file already goes
  through.
- **`assist_workflow.py`, tested directly.** Its six command handlers were only ever
  exercised transitively through CLI-level tests; a dedicated test file now calls each
  directly, isolated from the argument-parsing layer.

## Internal

- Line-budget ledger entries lowered for `mcp.py` (2246 → 1859) and `flow/__init__.py`
  (3682 → 3193) following the extractions above; raised with reasons recorded for
  `viewer.py`, `viewer_git.py`, and `release.py` for the containment-check and
  version-source additions.

## Validation

- `node scripts/ci-check.mjs`: all steps green, including the new coverage-floor ratchet.
- pytest full suite (1239 tests), vitest (834 tests), `tsc --noEmit`, line-budget,
  status-constants all passed.
- Logics lint OK, workflow audit 0 issues.
