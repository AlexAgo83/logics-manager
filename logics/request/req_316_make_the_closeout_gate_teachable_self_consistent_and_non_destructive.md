## req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive - Make the closeout gate teachable, self-consistent, and non-destructive
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: A gate that says what it wants and agrees with itself
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Learn what a proof must look like from the finding, not by running a repair to diff what it wrote.
- Get one answer to whether a request can be closed, not three.
- Clear an indicator finding by doing what the tool recommends.
- Keep a proof written by hand when the repair runs afterwards.

# Context
- Four field reports, all against version 2.20.0 and all on the same surface: the gate that decides whether work can be closed. Each was reproduced from a real corpus, and two of the hypotheses in them were confirmed by reading the code.
- The proof format is undocumented and load-bearing in three ways at once. The target must be `This task.` -- a backlog ref is not accepted; the keyword must be `Proof:`; and there must be one line per acceptance criterion, since a grouped line naming several is counted for none of them. None of the three is stated in the finding, in `--explain`, or in the command's help. The reporter found them by running the repair purely to diff its output.
- Worse than undocumented: the repair the finding recommends writes `Evidence needed:` while the check requires `Proof:`, so running the repair the finding suggests produces lines the same finding still rejects. And `flow scaffold request-chain` generates grouped lines, so the scaffold's own output does not satisfy the gate its own corpus will meet at closeout.
- Three commands answer the same question differently on an unchanged corpus: `flow validate` reported one finding about the request not being closed, `flow validate-closeout` reported three acceptance criteria without proof, and `closeout --dry-run` reported all thirteen. Each derives the proof state its own way, and nothing says which is authoritative.
- The indicator gate cannot be cleared honestly on a committed document. Its comparison falls back to the last commit when the working tree and index are both clean, so a document whose last commit carried a body change without an indicator change stays flagged with no sequence of commands that clears it. That also explains the reporter's observation that which documents are flagged changes between runs: the flagged set is the contents of the last commit.
- The same finding names every indicator the document kind requires rather than the ones actually missing, which is why `From version` appears in a list of things to update on a document where it has never been edited.
- The repair appends rather than reconciles: a section that already carries hand-written proofs ends up holding both those and a placeholder for every criterion, so the operator deletes one set or the other by hand.
- One design decision is unavoidable and is taken here rather than left implicit: the indicator gate will judge the working tree and the index, and stop falling back to the last commit. That fallback exists to catch a commit made without updating indicators, so removing it without replacement reopens that hole -- which is why the slice that does it also has to say what catches that case instead.

# Acceptance criteria
- AC1: A finding about a missing proof states the form a proof must take, well enough to write one without running anything else.
- AC2: Running the repair a finding recommends produces lines that satisfy that same finding.
- AC3: A corpus produced by the scaffold satisfies the closeout gate without being rewritten by hand.
- AC4: `validate`, `validate-closeout` and `closeout --dry-run` derive proof state from one implementation and agree on an unchanged corpus.
- AC5: An indicator finding can be cleared by following what the tool recommends, on a committed document as well as an uncommitted one.
- AC6: An indicator finding names only the indicators it is actually missing.
- AC7: A repair never removes or duplicates a proof an operator wrote.
- AC8: Each behavior leaves behind a test that fails against the current implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_056_say_what_actually_happened.md
- logics_manager/flow/__init__.py
- logics_manager/flow/docs.py
- logics_manager/lint.py
- logics_manager/flow_evidence.py

# AI Context
- Summary: Make the closeout gate teachable, self-consistent, and non-destructive
- Keywords: request-chain-scaffold, make the closeout gate teachable, self-consistent, and non-destructive, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make the closeout gate teachable, self-consistent, and non-destructive.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`
- `item_643_derive_the_proof_verdict_once`
- `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`
- `item_645_repair_without_overwriting_what_was_written_by_hand`
