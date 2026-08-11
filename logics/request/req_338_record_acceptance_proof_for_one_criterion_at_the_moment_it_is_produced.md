## req_338_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced - Record acceptance proof for one criterion at the moment it is produced
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Complexity: Medium
> Theme: Evidence capture
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Proof can only be written for a whole request at once, with one shared text, so evidence produced during the work is reconstructed from memory at closeout instead of recorded when it was true.
- Keywords: evidence, ac-proof, closeout, per-criterion, provenance
- Use when: Changing how acceptance proof is captured or written into task docs.
- Skip when: The work concerns whether proof is *required*, or how traceability findings are reported.

# Needs
- Evidence is produced while the work happens: a measurement, a command that passed, a check on a second host. It is written down hours later, at closeout, from whatever the author still remembers. The corpus asks for proof precisely to prevent recollection standing in for verification, and the capture step is where that guarantee is lost.
- Nothing here is dishonest; the gap is mechanical. Between measurement and writing sit an implementation, several files, and often a context boundary. What survives is a summary of a summary.
- Concretely, from a release cycle driven through this workflow: a latency figure measured at 0.57s, a transport verified on three hosts, an icon captured from a real desktop session. Every one of them was re-derived at closeout. The first attempt at one of those numbers was in fact wrong — the process being measured had exited early — and only re-running it at capture time surfaced that. Proof written from memory cannot catch its own invalidity.

# Context
- Two commands write proof today and both operate on a whole request: `flow validate <request> --apply-fixes --proof "<text>"` and `flow repair ac-traceability <request> --proof "<text>"`. Neither takes a criterion selector, so the same string lands on every criterion missing an entry.
- That shape is right for its purpose — filling structural gaps deterministically — and wrong for evidence: one sentence cannot be true of `AC1` and `AC5` at once, so the text that satisfies the check is necessarily vaguer than the check intends.
- `release evidence add` already models the missing shape one level up: an append-only record with a kind, a status, a summary, and a target. What is absent is the equivalent inside a task, addressed to one acceptance criterion.
- `flow validate-closeout` already lists, per criterion, exactly what proof will be expected — so a task knows the shape of its own evidence from the moment it exists. The gap is only that there is nowhere to put an answer until the end.
- Scope: capturing proof for a single criterion at an arbitrary point in a task's life, and composing recorded proof at closeout. Out of scope: changing what counts as valid proof, the traceability findings themselves, and the existing whole-request repair commands, which keep working unchanged.
- **Shares a seam with `req_337`.** Both change how a criterion's proof is written and read: this one writes per-criterion records that compose into the traceability entry, that one decides which chain a criterion's proof may legitimately come from. Both land in `_ac_traceability_entry` (`logics_manager/flow/docs.py`) and `_doc_has_ac_with_proof` (`logics_manager/audit.py`). `req_337` should land first, so composition here writes into a matching rule that is already correct.
- Known risk: a capture command that is trivial to call invites proof recorded before the thing is true. Recording what was actually run, rather than only a claim about it, is what separates this from a faster way to write the same sentence.

# Acceptance criteria
- AC1: Proof can be recorded for a single named acceptance criterion of a task, at any point in that task's life, without closing anything and without touching the other criteria.
- AC2: A record captures the command that was run and its result alongside the summary, so a reader can tell verification from assertion.
- AC3: Records accumulate rather than replace: capturing proof twice for one criterion keeps both, in order, since a re-run after a fix is the common case and the second result is not always the interesting one.
- AC4: At closeout, recorded proof composes the traceability entry for each criterion that has one; criteria without a record behave exactly as they do today.
- AC5: The existing whole-request `--proof` commands are unchanged in behaviour and remain available.
- AC6: Tests cover capture for one criterion, accumulation across two captures, composition at closeout, a task where no proof was captured, and the absence of any lifecycle change from a capture.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow_evidence.py`
- `logics_manager/flow/docs.py`
- `logics_manager/audit.py`
- `tests/python/test_flow_cli.py`

# Backlog
- `item_699_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced`
