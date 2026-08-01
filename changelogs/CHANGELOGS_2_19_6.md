# Logics Manager 2.19.6

Agent-facing correctness. A full field session on an external project produced
sixteen findings, all of the same shape: an agent that trusted the tool's output
produced wrong work. Generated documents asserted things that were false about
the project they described, and commands reported outcomes that had not occurred.
This release closes all of them, each covered by a regression test using the
field report's verbatim strings.

## Commands report what they actually did

`flow companion` and `flow roadmap propose` printed an unconditional
`Created ...` line after their dry-run preview, so a run that wrote nothing still
claimed creation. `flow start` modified every linked backlog item while
announcing only the named task. `logics-manager index` printed the same success
line whether or not it changed the file.

- Dry-run paths say `Would create` and never use the past tense.
- `flow start` lists every document it modified.
- `index` reports `Unchanged` when it wrote nothing.
- `flow roadmap validate` names every `##` heading it declined to parse instead
  of silently lowering the milestone count.

## Scaffolded tasks no longer assert work that has not happened

Every task produced by `flow scaffold request-chain` carried frozen boilerplate
whose `# Report` read `Implementation complete.` at `Progress: 0%`, and whose AC
traceability mapped to the scaffold command's own acceptance criteria rather than
the request's. Those false proofs also suppressed the deferred-traceability check
for the criteria they claimed, so the boilerplate silenced the gate that would
have caught it.

- `# Report` reads `Not started.` at all four generator call sites.
- `# AC Traceability` is derived from `backlog_items[].request_acs`, which the
  scaffold input already carried and which had to be re-derived by hand.
- Request criteria claimed by no backlog item are reported at scaffold time and
  marked in the generated task.
- `# Validation` carries a placeholder the closeout gate still rejects, and
  `sync append-note` drops that placeholder once real content arrives.

## Closeout accepts precise validation evidence

A substring blocklist rejected any evidence containing `failure`, so
`npm test passed (26 assertions, 0 failures)` was refused for stating its failure
count. Regression introduced in 2.10.0 by a fix intended to reject weak evidence.

- Failure words are matched as words, with negated forms (`0 failures`,
  `no failures`) excluded. Reported failures, placeholders and imperatives stay
  rejected.
- The repair hint no longer suggests `... passed`, whose `...` was itself a
  rejection marker.
- Closeout distinguishes evidence written then rolled back from evidence never
  written, which is what made `--validation` look inert.

## Indicator updates are kind-aware and honestly exitable

The mutation path validated against one global tuple while the linter declared
indicators per kind, so the gate could recommend a flag the target kind rejects.
On a roadmap the recommended remedy could not work, leaving a false
`> Non-semantic edit:` marker as the only exit.

- `Kind.mutable_indicators` is the single declaration both paths read.
- The gate's remedy names only flags the target kind accepts.
- New `--touch` stamps a review date, so a body edit whose values genuinely did
  not move can be re-baselined without inventing drift.
- Written values keep the template's percent form.
- The `Related *` family is settable, so an existing document can be linked to a
  chain by command rather than by hand.

## Reference handling

- Reference extraction excludes every fenced code block, not only mermaid
  fences, so a document can quote a reference without creating a link. Inline
  code spans still resolve: backticks are how this corpus writes real links.
- A bare ref of the wrong kind names the kind it found and the kind the command
  wants, instead of reporting an existing document as missing.
- Companion references resolve, and `flow repair mermaid` reports which refs it
  skipped and why rather than returning an ambiguous zero.

## Companion documents and discoverability

- `flow companion architecture` emits the `Drivers` indicator its own linter
  requires, so a generated ADR passes lint immediately.
- Both companion templates carry parenthesised prompts instead of prose about
  Logics Manager itself, which previously leaked verbatim into unrelated
  products' documents.
- `logics-manager flow list` lists in the default form its own help gives as the
  first example.
- New `logics-manager flow statuses` reports each kind's status vocabulary and
  settable indicators, both previously reachable only by guessing wrong.
- The scaffold schema documents its enums and the `priority` key it accepted
  without documenting.

## Validation

- `python3 -m pytest tests/python` passed: 610 tests, 0 failures, up from 562.
- `npm run ci:check` passed.
- `logics-manager lint` passed and `logics-manager audit` reported 0 blocking
  issues and 0 warnings across the corpus.
