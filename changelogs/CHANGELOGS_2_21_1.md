# Logics Manager 2.21.1

Four defects found by re-running the viewer's own campaigns after 2.21.0 shipped, a
crash reported from a real corpus, one documentation improvement, and one security fix.

## `flow repair ac-traceability` no longer crashes on its own skipped notes

Reported from a real corpus: `logics-manager flow repair ac-traceability` failed with
`TypeError: string indices must be integers, not 'str'` in `_print_repair_payload`,
after applying the repair but before it could report what it skipped. Two loops printed
the same `skipped` list under two different assumptions about its shape -- one written
for `ac-traceability`'s plain-string notes, the other for `mermaid`'s `{ref, kind,
reason}` records -- and both ran unconditionally regardless of which repair produced the
payload. `ac-traceability` never returns dict-shaped entries, so the second loop always
crashed on it. Both shapes are now handled in one loop.

## The viewer stops lying about what screen you're on

Two campaigns found the same defect class from two different angles: a status line
describing the wrong thing.

- The board's blank-screen watchdog fired whenever the project board's DOM emptied
  mid-reflow — including while a document screen (CDX, Workshop, a request) covered it and
  nobody was looking at the board. The resulting `Viewer error: Viewer board became empty
  unexpectedly` then sat in the status line indefinitely, since nothing else called
  `setMeta` while that screen stayed open. The watchdog now only fires while the board is
  actually the visible screen.
- `showDocument` — opening a request, backlog item, or task from a board card — rendered
  the document but never reported it, the one screen-opening path that didn't say
  `"<X> loaded."` like every other screen. Reading a document right after browsing
  anything else left that unrelated status on screen. It now says `Document loaded.`

## A two-word title no longer wraps one letter per line

`overflow-wrap: anywhere` let the browser break inside a word at any character once the
header's title column ran out of room on a narrow viewport — for a short title like
`CDX disk`, that meant every letter on its own line. The deeper cause: three separate
`@media (max-width: 900px)` blocks touched the same header layout across the file's
history, the last of which put the tab row back onto the title's row in a fixed corner
column, undoing an already-correct block just above it. Removed the conflicting override
and changed the wrap rule to `break-word`, which still wraps at spaces first.

## The duplicate-executable warning can be dismissed for the session

The "other logics-manager executable on PATH" banner had no dismiss, unlike the
environment-warning banner beside it — it persisted across every screen and viewport,
mobile included, where its three lines ate a large share of the visible height. It now
gets the same session-scoped dismissal, keyed on the duplicates named rather than the
rendered message. An actual update-available notice is never suppressed by it.

## Screenshots in the README

The board (requests, backlog, tasks, product briefs, architecture decisions as columns)
and an opened document, captured with the same CDP-driven approach the viewer campaigns
already use.

## Security

- `dompurify` bumped past GitHub advisory #32 (IN_PLACE hook removal leaving a detached
  subtree executable, XSS) — one version-bump away from the fix rather than something
  needing a wait. `npm audit` now reports 0 vulnerabilities; the now-stale allowlist
  exception for `dompurify` was removed.

## Internal

- Line-budget ledger entries raised, with reasons recorded, for the files each fix above
  touched (`logics_manager/release.py`, `clients/viewer/src/browser-host/index.js`,
  `clients/viewer/src/browser-host/util.js`).
- The attended tour script's own terminal-state detector was carrying the same
  "unavailable" vs "is not available" gap as the automated check it mirrors; aligned.

## Validation

- `node scripts/ci-check.mjs`: 23/23 steps green.
- Logics lint OK, workflow audit 0 issues.
- No open GitHub issues at release time; nothing to close.
