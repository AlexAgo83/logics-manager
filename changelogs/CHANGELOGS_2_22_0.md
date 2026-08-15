# Logics Manager 2.22.0

Two days, 33 requests: a viewer redesign wave (Fleet home, the project view, Git/CI/
Release/Settings, theming, scrollbars, a loading indicator, accessibility), the
performance work that redesign wave then needed (server duty cycle, payload transfer,
Insights/Health), and a run of smaller trust and workflow fixes -- the viewer link
travelling with a document everywhere it's named, `flow`'s traceability checks getting
harder to fool, and the GitHub issue bridge finally proven on the two issues it was built
to close.

## Fleet home becomes the product's first screen

`--fleet` used to present as a dismissable panel over an unchosen project, spending
~360px per project to show three digits, and a click behind it could do nothing at all --
a picker that cannot run without tkinter, a failure reported into an overwritten status
line, a `--fleet` flag that never reached the server, plus a CodeQL finding in the same
handlers. Fleet is now the root view, redrawn as rows triageable at a glance, with real
favorite and remove actions and no clashing native browser tooltip on their icon buttons.
A "root screen" latch that used to trap the operator once shown is now cleared like any
other navigation.

## The project view leads with the work that is live

91.5% of this corpus is finished, and the board, the card, the details panel and the
activity feed were all scaled for it. Their surface and visual channels now go to the
handful of items that are live, the board no longer asserts the project holds nothing
while its first payload is still in flight, and Runbooks -- already documents in the
payload -- get their own stage heading and a place in the reference index instead of a
screen no other companion kind needs.

## Git, CI, Release, Settings and the MCP connector answer their own question

Each of these screens held the facts needed to answer the one question it's opened with,
and none stated the answer -- now each leads with a verdict and its action. The MCP
connector's "Starting the secure tunnel..." hang is fixed at the root: a regex-only output
capture, a fallback guarded on an unawaited return code, and an unchecked fetch all
destroyed the connector's own stated failure reason; and the CDX update banner stops
serving a day-old "you should update" answer once the tool has already been updated.

## Corpus Insights, Health and Getting Started earn the numbers they print, and answer fast

Insights no longer prints a total beside its own component or counts a fresh scaffold as a
defect; Health no longer shows a warning the filesystem itself contradicts; Getting
Started measures its prose against the project it actually describes. Both screens also
got faster: Insights/Health were paying for an audit and a lint uncached on every look,
1.39s in-process growing to a measured 4.18s cold / 0.97s warm lint over HTTP -- now
cached like the rest of the corpus reporting, with one quadratic link sweep and a payload
larger than either screen shows both trimmed down. `ac_duplicate_proof` also stopped being
437 of the audit's warnings on 122 already-closed documents while keeping the signal.

## Theming, Workshop/CDX, scrollbars, a loading indicator, and keyboard/colour access

The shared stylesheet declared `color-scheme: light dark` while the standalone viewer's
palette was unconditionally dark, so a host resolving to light rendered every native
control light-on-dark; Workshop and CDX's remaining mockup gaps (repeated constants,
Explorer opening empty, placeholder metric tiles) are finished, and a screen-by-screen
review against the approved redesign mockups closed what several screens had only
partly shipped. Every scrollable region now uses one discreet custom scrollbar with no
visible track. A stage-coloured ring travels the header's edge while a screen loads --
including the case where no screen is open at all, gated by a threshold so a 12ms cached
answer never flashes it. Five chains that had moved status onto colour alone now state a
second channel, and keyboard navigation is no longer scoped to one item and owned by none.

## The reader and the filter panel say something

The reader no longer leads with an uppercased file path or sets prose at a 150-character
line; the filter panel no longer repeats one count four times while disagreeing with the
board underneath it.

## Released artifacts carry only the product

The dev-only demo board could reach users on the npm and VSIX channels because its gate
recognised a dev tree by a file both channels ship -- fixed with a signal a release
cannot carry, and proven directly against the built artifacts rather than assumed.

## The viewer server stops degrading the longer it stays open

The `/api/items` payload endpoint answered in 6.1s fresh and 38.0s after 2h30 of uptime
over the same corpus, rebuilding all 1615 documents on every 15-second poll; static
assets served with `Cache-Control: no-store` and no compression, and the shipped client
bundle was unminified. All three are fixed: cached rebuilds, compressed and cacheable
static delivery, and a minified bundle.

## The viewer link travels with the document, everywhere it's named

`flow show`, `sync list-docs`/`search-docs`, and the MCP tools that read or list Logics
docs (`read_logics_doc`, `list_logics_docs`, `search_logics_docs`, `list_active_work`,
`list_companion_docs`) carry the running viewer's URL for the document in question, short
enough to write inline in a sentence. Settings' restart now brings the viewer back on the
address already open, instead of leaving the registry advertising one that's gone.

## A status change and its commit become one step, not two

Changing a workflow document's status from the viewer now offers a confirmation modal
that states the old status, the new status, which document, and a commit checkbox with a
sensible default message -- wired to the git-commit route the viewer already had. Accept
it and the status change and its commit land as one confirmed action; decline it and the
change is left uncommitted for a later batched commit.

## Documents edit in place in the browser

The standalone browser viewer no longer shells out to a system editor for a document edit
-- it opens an in-place screen with a plain textarea and Save/Cancel actions, offering the
same commit step the status modal added. VS Code's embedded panel is unchanged: it keeps
opening its own native editor, since that already is the in-place experience there.

## `flow`'s traceability checks get harder to fool, and its own writes stop tripping its own lint

Traceability validation checked only that a proof line existed, not that it named the
right target or wasn't duplicated across acceptance criteria -- a wrong or copy-pasted
proof passed silently. `flow`'s own write commands (`start`/`repair`/`closeout`) could also
leave a document in a state that its own indicator-lint then flagged, self-authored writes
distrusting themselves. Both are fixed, closing out the two GitHub issues (#20, #21) that
had been open about it.

## The GitHub issue bridge, proven on the case that motivated it

A reconciliation report states where the corpus and the issue tracker disagree: issues
with no linked request, Done requests whose issues are still open, and issues closed while
their request is still open -- reading only issue number, state, and labels, never a body.
An issue can be attached to an existing request without hand-editing the document, and
finishing a request that names issues can tell them the outcome as an explicit,
dry-run-by-default step. Proven for real: issues #20 and #21, open against a delivered
request since before this bridge existed, were attached and told through it, and the
reconciliation report no longer lists them -- closing the issues themselves stays a human
act.

## The auto-refresh stops paying for a cache that can never hit

An open viewer spent about 3.1s of every 15s answering questions nothing asked, mostly on
one cache with a lifetime shorter than the poll interval it was meant to smooth out. Cache
lifetimes for `cdx`/git status now floor at `max(2s, poll interval * 1.5)`, badge
components warm in the same warm-up pass as the corpus reports, and `/api/items` gates its
ETag/body on the corpus signature instead of recomputing every tick. Measured against this
repository's own corpus: a steady tick went from 3.1s to ~0.01s; the cold first poll after
start from 9.07s to 6.093s; a forced poll stayed at 4.833s, deliberately unchanged.

## README captures refreshed for the whole wave

The published captures predated every redesign in this cycle -- two of them showed the
dev-only demo corpus a released build no longer carries, and the prose beside them still
called the companion stages columns. Regenerated against this repository's own corpus on
the delivered screens, including a real bug the regeneration itself caught: the capture
script's Insights shutter clicked a dropdown-menu path left over from an earlier nav
redesign, silently timing out instead of shooting the current, direct Insights button.

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
- `npm run ci:check`
