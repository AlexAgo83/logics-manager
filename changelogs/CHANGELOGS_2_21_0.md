# Logics Manager 2.21.0

## Release evidence is judged against the commit the release was cut from

Recording evidence for every gate at `HEAD` and publishing used to leave the
release ready for exactly one moment: the next commit — even one the release
process itself makes, such as the checksum commit or the closeout it asks
for — made most gates report `evidence targets a different commit`, because
every gate was compared against current `HEAD`.

Each gate in the release contract now carries a `comparison`, `release` or
`branch`. A `release` gate (the default) compares its evidence against the
commit the version's tag points at, falling back to the working commit while
no tag exists yet. A `branch` gate compares against the current commit,
because the claim it makes — `git_push`, today — is about the branch, not
the tree the tag was cut from.

```bash
logics-manager release status
# Gates:
# - version_metadata [release]: passed
# - git_push [branch]: passed
# - ci [release]: stale (evidence targets a different commit (release))
```

A published release now stays green while work continues on the branch, and
the stale reason and `release status` output both name which comparison
failed.

This project's own contract also adds an `issue_closure` gate: a release is
not `github_release`-ready until the GitHub issues it resolved are closed,
recorded the same way as any other external evidence.

## Board filters answer with what the board actually shows

The panel filters — type, status, relations, activity, focus — and five
inherited checkboxes — hide completed, hide processed requests, hide specs,
show companion docs, hide empty columns — were applied in series, and
selecting anything in the panel never disarmed the inherited set. On a
repository where every document is Done or Settled, hiding completed
documents emptied the board no matter what the panel selected: type
`request` reported 308 documents and rendered none.

One authority now decides whether a document is shown, and the count above
the board is produced by that same predicate, so it states the number of
cards the board actually renders. The status option `Done` now selects
documents whose status is Done rather than documents that are merely closed,
and a status option that would return nothing says so before it is chosen.
The count also follows the search box, which it previously stopped doing the
moment a query was typed. The viewer campaign now fails when the count and
the board disagree, or when a filter returns documents it did not name, over
all thirty-four filter combinations.

## Viewer preferences are split between the operator and the repository

The extension lost every preference — favourites included — on every
restart, because they lived in one browser-storage entry scoped to the
origin the viewer was served from, and the extension serves it on a fresh
ephemeral port each launch. The standalone viewer, bound to a fixed port,
never had this problem.

Preferences are now kept on the server at two scopes: one file per machine
for what describes the operator (favourites, recently opened projects,
whether the workshop uses the system terminal, the refresh interval), and
one file per repository for what describes a corpus (workshop tab, cdx
columns and sessions). Two windows setting favourites at once are merged,
never overwritten wholesale, and an operator's existing preferences carry
over on first run rather than resetting.

## The viewer says what just happened, and what will not

- A project with no i18n or theme convention answers Translations and Theme
  as a normal, empty result instead of an HTTP 400, so the console stays
  clean and the status bar states the actual reason instead of leaving the
  screen looking broken.
- Every screen now reports when it has finished loading — Terminals and
  Commands previously never left "Workshop / terminals" — and a status line
  no longer outlives what it describes (a "Closing preview" message no
  longer survives the preview it described).
- Group by Type, Status or Theme now actually regroups the board; it
  previously rendered the same one-column-per-stage layout regardless of
  the selected mode.
- The start-up warning about another `logics-manager` on `PATH` can be
  dismissed for the session, and returns on the next one or sooner if the
  condition changes.
- Every screen now exposes a heading structure, so a screen reader can move
  between sections by heading rather than only by ARIA landmark.
- The viewer campaign now asserts each of the above at every viewport it
  sweeps, rather than only checking that a screen is non-empty.

## The closeout gate says what it wants, and agrees with itself

A missing-proof finding named neither the required target (`This task.`),
the required keyword (`Proof:`), nor that one line covers exactly one
criterion — and the repair the finding itself recommended wrote
`Evidence needed:`, which the same gate then rejected. `flow validate`,
`flow validate-closeout`, and `closeout --dry-run` could each report a
different verdict for the same corpus, because each derived proof state its
own way.

The finding now states the proof format inline, well enough to write one
without running anything else, and all three commands derive proof state
from a single implementation. The indicator gate now judges the working
tree and the index directly instead of falling back to the last commit when
both are clean, so a document can be re-baselined and cleared even when it
was already re-baselined earlier the same day. A repair adding placeholder
proof lines now only adds one per criterion a slice actually declares, and
never overwrites or duplicates a proof already written by hand.

A closeout that finishes the task but trips an unrelated repository-wide
check now reports it:

```bash
logics-manager closeout task_310
# Closeout: CLOSED (post-close validation failed) for logics/task/task_310_....md
```

`ok` still reports `false` — a caller gating a commit on it is right to —
but the new `closed` field says whether the task itself reached Done, so a
finished closeout no longer reads as one that never happened.

## Fixes

- An abandoned request (Obsolete, Archived, Superseded) is no longer asked
  for an implementation chain by either audit route; a delivered request
  still is.
- The VS Code extension's "runtime not tested against this plugin" warning
  now derives its upper bound from the plugin's own version instead of a
  hand-maintained constant, so it no longer fires on the exact pairing a
  release shipped.
- Nine flags across seven commands, including closeout's structured
  validation flags, were missing from their own `--help` screens; every
  screen now renders its flag section from the parser that declares it.
- A same-day re-baseline of a reviewed, body-only edit now clears the
  indicator gate; the comparison previously used day-level precision and
  treated the second re-baseline as a no-op.

## Internal

- The viewer's browser host, at 7853 lines, had cdx, git/CI, and the
  workshop lifted into their own modules on a proven seam (a factory
  returning its functions by name); the host is down to about 4065 lines,
  with the cdx screen's rendering moved out of the module it used to share
  with everything else.
- The viewer's shared state (41 mutable bindings, 30 constants) is now one
  named store the screens read through, replacing three hand-built
  accessors (`cdxState`, `workshopState`, `gitState`); screens are now
  declared and self-register rather than being dispatched by matching a
  document title string.
- The size-ledger guard now lowers a file's entry automatically when it
  shrinks, and refuses a raised ceiling unless the entry states what was
  tried and why the line was kept — turning an allowlist that only ever
  grew into a ratchet.
- The viewer's UI campaign (`tests/run_local_viewer_visual_smoke.mjs`) now
  reports every check it performs with a verdict and the value it
  measured, instead of stopping at the first failure and saying nothing
  about the rest; it asserts overlap, clipping, and unexplained-empty-state
  defect classes at each viewport it sweeps, and derives its screen list
  from the interface itself. Runbook at
  `docs/runbooks/viewer-ui-campaign.md`.
- An attended tour script (`scripts/dev/viewer-tour.mjs`) walks all
  fourteen navigation targets and is kept in the repository for repeat
  passes.
- The viewer's architecture (a named state store, server-driven
  invalidation vocabulary, declared screens) is now written down; two of
  its three premises did not survive measurement and were withdrawn rather
  than built (`item_631`).

## Validation

- `node scripts/ci-check.mjs`: 23/23 steps green.
- 1130 Python tests at 76% coverage against a 75% floor, 824 TypeScript
  tests across 75 files.
- Logics lint OK, workflow audit 0 issues across 1272 documents.
- VSIX packaged at 3.77 MB.
