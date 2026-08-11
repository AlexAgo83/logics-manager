# Logics Manager 2.21.8

A release about the tool being honest about itself, and one operator annoyance
fixed. Every item here came from driving 2.21.7 through this workflow rather than
from imagining what might go wrong -- including two defects in 2.21.7's own new
features, found by using them.

## The tool says when it is not the tool this repository expects

`logics-manager` usually resolves to a bundled install, so a repository at one
version can be inspected by a runtime at another, and nothing said so. The failure
is one-sided, which is what makes it worth a check: an older runtime does not know
about newer rules, so it reports *fewer* findings and the corpus looks healthier
than it is.

This is not hypothetical. During the 2.21.7 cycle, `logics-manager audit` answered
`0 blocking` from a 2.21.6 runtime on a 2.21.7 tree. The same corpus, run through
`python3 -m logics_manager`, reported 4 blocking findings and 234 warnings -- and a
measurement taken from the first answer had already been written into a request as
acceptance proof before the disagreement surfaced.

The comparison was always available and simply never made: the runtime reads the
`VERSION` beside its own code, and the repository has its own at the root. The
notice names both versions and both ways out, updating the install or running the
repository's own code.

It informs and never gates. A deliberately pinned runtime stays usable: no exit
code changes, and the notice goes to stderr so `--format json` stdout stays
machine-readable. Only commands that state something about the corpus warn --
`view` and `config` serve rather than report. Running from source compares a file
with itself and correctly stays silent.

## Every source guard is reachable before the push

`scripts/check_function_length.py` ran from CI and from no local entry point, so a
function grown past its ledger entry was found *after* a push -- which is exactly
how it was found during the 2.21.7 cycle. It is now `npm run check:function-length`
and part of `npm run lint`, beside `check:line-budget`, which is what CONTRIBUTING
tells a contributor to run and what CI runs too.

Compounding it, `core.hooksPath` was configured on every `npm install` to
`.githooks/`, for a pre-commit hook that guarded the committed `viewer_assets`
mirror. The mirror became generated, the hook was deleted with the rest of that
tooling, and only the config survived -- so every clone since June pointed git at a
directory that does not exist, silently running no hooks and blocking any future
one.

Restoring a hooks directory would resurrect something deliberately retired, so the
config goes instead. It is cleared rather than merely stopped, since existing
clones already carry the stale value, and it is cleared narrowly: only when it
still reads `.githooks` and that directory is absent. A contributor who points
`core.hooksPath` somewhere of their own keeps it. Unsetting another tool's config
on every install is the same overreach that created this, in the other direction.

## A criterion no linked document accounts for is reported early

A backlog item carried five acceptance criteria while its request carried six: the
request gained one at grooming and the slice never learned of it. Nothing said so
until a closeout gate demanded proof for the sixth -- the worst moment to discover
a chain is incomplete, because the work is done and the gap is structural.

`ac_not_covered_by_chain` is deliberately distinct from the traceability findings
beside it, which are about *proof*. This one fires when the chain never learned the
criterion exists: no linked item or task carries a line for it, in any shape. So it
is not deferred either -- adding the missing line needs no evidence and no finished
work, which makes it actionable the moment it is true.

A warning, and scoped to requests still open: after closeout the record is history.

## Getting Started stops reopening on every release

Reported by the operator: the Getting Started panel reopens in VS Code over and
over, and dismissing it on every plugin open is a nuisance.

A guard already existed and watched the wrong thing. It stored the extension
version per workspace, so the panel reopened on every release whether or not a word
of the page moved. 2.21.4, 2.21.5, 2.21.6 and 2.21.7 shipped within two days with
an identical page, and the mechanism produced four reopens while working exactly as
written.

The guard now keys on a signature of what the page says. That signature is taken
over the page's content parts, never over the rendered HTML: `buildOnboardingHtml`
embeds a fresh nonce in its CSP, so the document differs on every call and hashing
it would reopen the panel *always* -- strictly worse than the version key it
replaces. A test pins it: five builds, one signature.

One function is the single source for both the page and its signature, so a section
added to the page is covered without a second list to remember. The guard stays
scoped per workspace root, and the on-demand entry points -- the Tools menu and the
Insights footer -- remain unconditional.

Because the stored value was a version string, there is no way to know
retroactively whether a user has seen the current content: every existing user sees
the page one last time, then never again until it changes.

## Two fixes to 2.21.7's own new features

**Recorded proof now composes into a scaffolded task.** `flow evidence add` shipped
in 2.21.7; the first chain to use it end to end reached closeout with seven blocking
findings *despite* all seven criteria having records. `flow scaffold request-chain`
writes a generated `Proof deferred to slice closeout.` line per criterion, and the
repair skipped any criterion that already had a line at all. That guard is right in
intent -- skipping never destroys authored content, replacing can -- but it made
composition unreachable for scaffolded tasks, which is the common case. It only
appeared to work earlier because those tasks had no `AC Traceability` section for
the scaffold to fill. The generated wording is now a named constant that the
scaffold writes from, and composition replaces a line only when it still carries
exactly that wording. Authored text is left strictly alone, record or no record.

**A section can no longer claim `none` above a real entry.** `flow new` writes
`- none` under `# Backlog`, and `flow deliver` stripped it after appending a slice
-- but `promote request-to-backlog` did not, so every request promoted that way
shipped the contradiction and neither `lint` nor `audit` mentioned it. Appending a
real bullet now evicts the placeholder it contradicts, at the one helper every
writer goes through. Eviction is local: a section nothing was appended to keeps its
placeholder, because there it is still true.

## Also

- The three checks 2.21.7 added were lifted out of `audit_payload` into named
  functions when the function-length guard flagged its growth.
- `logicsViewProvider`'s onboarding path, the audit's lineage and code-anchor
  passes, and the runtime-drift notice each gained their own test file rather than
  extending an existing one.
