# Logics Manager 2.21.7

Seven requests, filed after a review of the open corpus, and one theme running
through four of them: the corpus can be wrong about itself, quietly. Lineage
inferred from prose, proof matched by a number two unrelated documents happen to
share, a report so full of expected findings that a real one would be skimmed
past, and pointers into code that moved. Plus a viewer menu that had drifted from
its own registry, and a naming papercut paid by every path guess.

## Lineage is what a document declares, not what it mentions

Lineage was derived by scanning a document's whole text for reference tokens, so
citing prior art in prose adopted it as a parent. Two things leaked across.

**Lifecycle.** Deferred traceability findings turn blocking as soon as any linked
task is Done, so naming a finished chain flipped a brand-new `Draft` request's
findings to blocking, for work nobody had started.

**Proof, and this is the one that hides gaps rather than inventing them.** Proof
is matched by AC identifier alone, and every document numbers from `AC1`. A cited
chain that had proved its own `AC1` through `AC4` therefore satisfied four
criteria it had never seen. This was observed while filing one of the requests in
this release: the audit reported exactly one blocking finding, its `AC5`, because
the chain it cited as prior art had proved four criteria and stopped there. The
workaround at the time was to delete the citation, which makes the corpus poorer
to keep the audit honest.

Lineage now comes from one declared mapping of link sections per kind pair --
`# Backlog`, `# Links`, `# Tasks`, and `# AC Traceability`, which is where legacy
requests map a criterion to the items that satisfy it. A reference in narrative
prose creates nothing.

Tightening a rule silently would drop the lineage of documents that only ever
declared a parent in prose, so it does not: `lineage_mentioned_but_not_declared`
reports each one, naming the inferred parent and the section it belongs in. It
fires on open documents only -- a closed one describing its lineage in prose is
history, and nagging about two hundred of them is how a report teaches itself to
be skimmed.

## A non-empty audit report now means an operator is needed

A corpus whose only open request was still `Draft` produced a report made
entirely of findings the tool itself labels as expected: *"proof is deferred --
expected at task closeout; no linked task is Done yet"*, once per acceptance
criterion, on every run. Verbosity scaled with the quality of the request, which
is the wrong incentive. The risk was never the noise; it was that an operator who
sees eight expected warnings every time learns to skim, and the first genuine
finding to arrive alongside them is the one that gets missed.

Deferred findings are withheld from the default text report. Nothing is dropped:
the report ends with a count line naming how many were withheld and the flag that
shows them, `--include-deferred` restores the per-finding output unchanged, and
`--format json` carries them either way. Severity and exit codes are untouched --
this is presentation, and it happens in the renderer, never in the payload.

`AuditIssue` carries the `deferred` flag, so this is a general facility rather
than a special case for one finding code.

## Docs are told when their code anchors stop resolving

A `# Context` or `# References` section earns its cost by pointing at real code,
and those pointers age. Nothing reported it: `companion_doc_refs_missing_target`
checks references *between* workflow documents, and there was no equivalent for
references *into* the codebase. A missing pointer costs a search; a wrong one
costs a search plus the time spent believing it, and an agent has no instinct
that says "this file felt like it should exist".

Two tiers, and deliberately not a third. A path either exists or does not, so
`code_anchor_path_missing` is a plain warning. A symbol can only be searched for,
so its absence is strong evidence and not proof -- `code_anchor_symbol_not_found`
is worded as a hint and rides the withholding above rather than inventing a
second suppression path. A line number is stale almost immediately and is never
checked; a trailing `:123` is stripped before the path is resolved.

Open documents only, for the same reason as above. The repository text is read at
most once per audit, and only when a symbol actually needs it.

## Acceptance proof can be recorded when it is produced

Proof could only be written for a whole request at once, with one shared string
landing on every criterion still missing an entry. That shape is right for
filling structural gaps and wrong for evidence: one sentence cannot be true of
`AC1` and `AC5` at once, so the text that satisfies the check is necessarily
vaguer than the check intends. And it is written at closeout, hours after the
thing it describes was true -- a latency figure, a transport verified on three
hosts, an icon captured from a live session, every one re-derived from memory,
and one of them wrong because the process being measured had exited early. Proof
written from memory cannot catch its own invalidity.

```bash
logics-manager flow evidence add <task> --ac AC1 \
  --summary "menu covers the registry" \
  --command "npx vitest run tests/viewer.browser-host.test.ts" --result passed
```

One record, one criterion, at any point in the task's life. Nothing about the
lifecycle moves. Records accumulate rather than replace, since a re-run after a
fix is the common case and the second result is not always the interesting one.
What was actually run is recorded beside the claim, which is what separates this
from a faster way to write the same sentence. At closeout a criterion's records
compose its traceability entry; a criterion with no record behaves exactly as
before, and the existing whole-request `--proof` commands are unchanged.

## The Workshop menu is generated from its registry

The viewer's Workshop menu was hand-written markup listing three of the four
sections `workshopTabs` declares. Runbooks -- the newest surface, so the one most
likely to be looked for -- had no entry, and was reachable only by opening a
section that *was* listed and finding it in the tab strip. Reported by the
operator: *"in the viewer, in the Workshop menu I don't have the Runbook button
and I have to go into one of the screens to find it in the slider."*

Adding one button would have fixed the symptom and left the cause. The entries
are generated from the registry, so a section added there appears with no edit to
`index.html`, and a test fails if any registry section has no menu entry. The
project tools below the separator keep their own markup and their hidden states.

## Either spelling of a workflow directory now resolves

Under `logics/`, five directories are singular and two are plural, with no rule
to infer, so `logics/task/task_048*.md` matched nothing and finding the file cost
an extra search. Small, but paid by every agent and every shell one-liner, and
worst for agents, which reconstruct paths from a pattern rather than from memory.

Renaming was measured and rejected -- 225 occurrences of `logics/tasks` and
`logics/specs` alone across `logics_manager`, `clients` and `tests`, before
counting consuming projects, tooling, docs, and every git history link. The
alternate form is simply accepted wherever a path is resolved. The alias map is
derived from `WORKFLOW_DIRS`, so a directory cannot be added with only one of its
forms handled.

Nothing on disk is renamed, moved, or created, and the canonical form is still
what every command writes. Tolerance does not become ambiguity: if both forms
ever exist as real directories, the canonical one wins and `health` reports the
other as a corpus anomaly. The canonical names are documented in `docs/cli.md`.

## A generated `# AI Context` asks to be filled

`# AI Context` exists so an agent can decide, cheaply, whether to open a
document, which only works if its lines say something the title does not. As
generated they did not: `flow new request --title "..."` produced the title,
lowercased, behind a fixed prefix; keywords named the tool rather than the
subject; `Use when` described the act of scaffolding. Nothing ever asked for it
to be replaced, so delivered documents still carried it, and four lines were
spent on every read, by every agent, to learn the title a second time.

Generating a summary from the body risks plausible filler, which is the failure
this is about, so the generators emit an explicit unfilled marker instead --
the gap is visible rather than disguised. Keywords are the one field genuinely
derived, from the title's own subject words.

The check that policed this was a hand-maintained copy of templates it did not
read, so the templates moved and the rule stayed blind: its list held three
strings the scaffold no longer emitted. The placeholder set is now derived from
the module that owns what the generators write, and a test fails if a template's
wording changes without the check following it. It also reports where it will be
seen -- the old finding sat behind `token_hygiene`, which is off in both the
relaxed and standard profiles. The new one is ungated but scoped to open
documents and can never block, so a corpus of legacy scaffolded docs will not
fail its next audit wholesale. No existing document is modified.

Nine templates across two modules became one shared builder.

## Also

- Every open request carried a stray `- none` placeholder beside a real ref under
  `# Backlog`: `flow deliver` strips it, the `scaffold request-chain` path did
  not, and nothing reported it.
- Four requests in this release form one dependency cluster and none of them said
  so. The ordering is now recorded in each: lineage first, then the withholding
  it makes safe, then the check that consumes it.
