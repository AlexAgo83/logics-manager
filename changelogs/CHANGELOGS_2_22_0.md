# Logics Manager 2.22.0

Six requests landed this release: the viewer got cheaper to leave open, more honest about
what it just did, and easier to work in without leaving it; `flow`'s own traceability
checks got harder to fool; and the GitHub issue bridge finally proved itself on the two
issues it was built to close.

## The auto-refresh stops paying for a cache that can never hit

An open viewer spent about 3.1s of every 15s answering questions nothing asked, mostly on
one cache with a lifetime shorter than the poll interval it was meant to smooth out. Cache
lifetimes for `cdx`/git status now floor at `max(2s, poll interval * 1.5)`, badge
components warm in the same warm-up pass as the corpus reports, and `/api/items` gates its
ETag/body on the corpus signature instead of recomputing every tick. Measured against this
repository's own corpus: a steady tick went from 3.1s to ~0.01s; the cold first poll after
start from 9.07s to 6.093s; a forced poll stayed at 4.833s, deliberately unchanged.

## A status change and its commit become one step, not two

Changing a workflow document's status from the viewer now offers a confirmation modal
that states the old status, the new status, which document, and a commit checkbox with a
sensible default message -- wired to the git-commit route the viewer already had. Accept
it and the status change and its commit land as one confirmed action; decline it and the
change is left uncommitted for a later batched commit. This is viewer-only: the CLI and
MCP tools already returned structured payloads without a confirmation UX, and nothing
about legal status transitions changed.

## Documents edit in place in the browser

The standalone browser viewer no longer shells out to a system editor for a document edit
-- it opens an in-place screen with a plain textarea and Save/Cancel actions, offering the
same commit step the status modal added. VS Code's embedded panel is unchanged: it keeps
opening its own native editor, since that already is the in-place experience there.

## The viewer link travels with the document

`flow show`, `sync list-docs`/`search-docs`, and the MCP tools that read or list Logics
docs (`read_logics_doc`, `list_logics_docs`, `search_logics_docs`, `list_active_work`,
`list_companion_docs`) now carry the running viewer's URL for the document in question,
when a viewer is running for the repository. An assistant naming a request, backlog item,
or task in a report can pass that link along instead of building one by hand or leaving
the reader to go find it.

## `flow`'s traceability checks get harder to fool, and its own writes stop tripping its own lint

Traceability validation checked only that a proof line existed, not that it named the
right target or wasn't duplicated across acceptance criteria -- a wrong or copy-pasted
proof passed silently. `flow`'s own write commands (`start`/`repair`/`closeout`) could also
leave a document in a state that its own indicator-lint then flagged, self-authored writes
distrusting themselves. Both are fixed, closing out the two GitHub issues (#20, #21) that
were open about it since before this release.

## The GitHub issue bridge, proven on the case that motivated it

A reconciliation report now states where the corpus and the issue tracker disagree: issues
with no linked request, Done requests whose issues are still open, and issues closed while
their request is still open -- reading only issue number, state, and labels, never a body.
An issue can be attached to an existing request without hand-editing the document, and
finishing a request that names issues can tell them the outcome as an explicit, dry-run-by-
default step. Proven for real rather than by hand: issues #20 and #21, open against a
delivered request since before this bridge existed, were attached and told through it, and
the reconciliation report no longer lists them. Closing the issues themselves stays a
human act.

One design gap surfaced by that proof: the report first kept flagging a Done request's
already-told issue as a disagreement purely because the issue was still open, with no way
to tell "already told, awaiting a human close" apart from "never told at all". It now
checks whether the issue already carries the label the bridge would post and excludes it
if so.

## Validation

- `npm run test:coverage:src`
- `npm run test:coverage:media`
- `python3 -m coverage run --source=logics_manager -m pytest tests/python/ -q`
- `python3 -m coverage report --format=total`
- `npm run test:viewer-smoke`
- `npm run test:smoke`
- `npm run package:ci`
- `npm run test:npm-cli`
- `npm run lint:logics`
