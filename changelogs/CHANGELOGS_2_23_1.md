# Logics Manager 2.23.1

A correctness release. It closes eight findings from a repository review — two of
them writes that went beyond what the operator selected — and settles where the
operator's own preferences live.

## Writes stay inside what was selected

A selected filename is a literal path, not a pattern. Git pathspecs are glob-matched
by default, so committing a file named `part*.txt` also staged `part-secret.txt`.
Every path the viewer hands to Git is now a `:(literal)` pathspec, for staging,
committing and diffing alike.

The repair route fell back to running the real repair whenever it could not read its
request. Malformed JSON, an invalid `Content-Length`, a non-object body or a
non-boolean `preview` now return a client error and leave every document untouched;
a valid preview stays read-only and a valid apply still repairs.

## The viewer survives its own state

An unreadable Fleet root raised out of the viewer's constructor, which looked exactly
like every project and favourite disappearing. One bad root now costs only that root.
Saving the root list no longer rewrites it from the existence-filtered view, which
used to delete roots that were merely unmounted.

An update cache holding a list, or a non-numeric timestamp, raised out of every update
check. An unreadable cache is now a cache miss.

## The screen and the switch agree

The Activity / Project / Review switch had three owners and only one of them told the
others, so the highlighted tab could drift from the screen actually shown — including
after adding or changing a project. There is now a single writer, and the surface is
remembered per project: each project reopens on the view it was left on, and a project
with no remembered view is left where it is rather than moved to a default.

An open Review surface also refreshes in place. Its refresh branch required a document
title that nothing ever set, so the timeline only reloaded after leaving and reopening
the surface.

## Grouped activity and folder pickers

A grouped chain row measured the full width of the list and then offset itself, so it
ran past the right edge at every viewport. Long chain titles now wrap inside the row.

The Fleet root and project-folder pickers each state what the chosen folder is for and
carry their own confirmation — "Use as fleet root" or "Open this project" — name the
current folder, and keep dot-folders one toggle away instead of padding the list.
Cancel and Close only dismiss.

## Operator preferences say where they live

Preferences follow the process `HOME`, so a viewer launched under a different one opens
a different record and favourites appear lost. The record in use is now named in the
launch banner, the Settings screen and the viewer payload, and `doctor` warns when the
account has more than one. `adr_033` keeps the `HOME` keying — a process that sets
`HOME` is asking to be isolated — and makes the other record reachable through an
explicit adoption that merges rather than replaces and never writes to the file it
reads.

## Housekeeping

The `js-yaml` override moves to 4.3.2, which clears the remaining blocking advisory, so
`npm run ci:check` passes end to end again. The viewer bundle freshness check now runs
from `npm run lint`, not only from full CI.

## Validation

- `npm run ci:check`
- `python3 -m pytest tests/python/ -q`
- `npx vitest run`
- `npm run lint`
- Browser verification in headless Chrome for the surface switch, per-project view
  memory, grouped activity width, both folder pickers, and Fleet root restoration.
