## item_699_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced - Record acceptance proof for one criterion at the moment it is produced
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Record acceptance proof for one criterion at the moment it is produced
- Keywords: backlog-groom, request, record acceptance proof for one criterion at the moment it is produced, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Record acceptance proof for one criterion at the moment it is produced.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Evidence is produced while the work happens: a measurement, a command that passed, a check on a second host. It is written down hours later, at closeout, from whatever the author still remembers. The corpus asks for proof precisely to prevent recollection standing in for verification, and the capture step is where that guarantee is lost.
Nothing here is dishonest; the gap is mechanical. Between measurement and writing sit an implementation, several files, and often a context boundary. What survives is a summary of a summary.
Concretely, from a release cycle driven through this workflow: a latency figure measured at 0.57s, a transport verified on three hosts, an icon captured from a real desktop session. Every one of them was re-derived at closeout. The first attempt at one of those numbers was in fact wrong — the process being measured had exited early — and only re-running it at capture time surfaced that. Proof written from memory cannot catch its own invalidity.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Proof can be recorded for a single named acceptance criterion of a task, at any point in that task's life, without closing anything and without touching the other criteria.
- AC2: A record captures the command that was run and its result alongside the summary, so a reader can tell verification from assertion.
- AC3: Records accumulate rather than replace: capturing proof twice for one criterion keeps both, in order, since a re-run after a fix is the common case and the second result is not always the interesting one.
- AC4: At closeout, recorded proof composes the traceability entry for each criterion that has one; criteria without a record behave exactly as they do today.
- AC5: The existing whole-request `--proof` commands are unchanged in behaviour and remain available.
- AC6: Tests cover capture for one criterion, accumulation across two captures, composition at closeout, a task where no proof was captured, and the absence of any lifecycle change from a capture.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Proof can be recorded for a single named acceptance criterion of a task, at any point in that task's life, without closing anything and without touching the other criteria.
- request-AC2 -> This backlog slice. Proof: AC2: A record captures the command that was run and its result alongside the summary, so a reader can tell verification from assertion.
- request-AC3 -> This backlog slice. Proof: AC3: Records accumulate rather than replace: capturing proof twice for one criterion keeps both, in order, since a re-run after a fix is the common case and the second result is not always the interesting one.
- request-AC4 -> This backlog slice. Proof: AC4: At closeout, recorded proof composes the traceability entry for each criterion that has one; criteria without a record behave exactly as they do today.
- request-AC5 -> This backlog slice. Proof: AC5: The existing whole-request `--proof` commands are unchanged in behaviour and remain available.
- request-AC6 -> This backlog slice. Proof: AC6: Tests cover capture for one criterion, accumulation across two captures, composition at closeout, a task where no proof was captured, and the absence of any lifecycle change from a capture.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_338_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_338_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_338_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced.md`.
- Generated locally by logics-manager.
- Task `task_335_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_335_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced`
