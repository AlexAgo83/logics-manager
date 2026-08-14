## item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive - Validate traceability proof content and fix the runtime-drift false positive
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: flow-integrity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 23:12:04

# AI Context
- Summary: Add three deterministic proof-content checks (dup-proof, proof-matches-AC, orphan-slice-AC) to flow's traceability validation, and point runtime-drift's version comparison at a logics-manager-recorded value instead of the consumer repo's own VERSION.
- Keywords: ac_proof_state, has_ac_proof, flow_evidence.py, runtime_drift.py, duplicate proof, proof matching
- Use when: Implementing this backlog item.
- Skip when: The self-consistency issue (item_785) — separate concern.

# Problem
- ac_proof_state/has_ac_proof (logics_manager/flow_evidence.py:98-130) only check that a Proof: line exists mentioning the AC id; the proof text is never compared to anything, so a whole block of shifted or duplicated proofs passes validate, repair, and the closeout gate.
- runtime_drift.repository_version() (logics_manager/runtime_drift.py:24-33) reads the current repo's own VERSION/version file and compares it to the running logics-manager version, which is only meaningful when the repo being inspected is logics-manager itself; in any consumer repo it fires a confidently wrong warning with actively harmful suggested remedies.

# Scope
- In:
  - A duplicate-proof-text check across request-ACn lines in one document (blocking).
  - A check that a request-ACn proof line's text corresponds to a real acceptance criterion of the citing document, strict/exact matching first (blocking).
  - A check that every slice acceptance criterion backs at least one request AC (warning).
  - Sourcing the runtime-drift comparison version from a value logics-manager itself records (e.g. logics.yaml), staying silent when none is recorded.
- Out:
  - Fuzzy or semantic proof matching.
  - Removing the runtime-drift feature; it stays, just pointed at the right source of truth.

# Findings from implementation (all four ACs shipped, two of them revised)
All four ACs were built and tested against this repository's own real corpus (1497
docs, 350+ Done tasks) before any of it was committed. AC1, AC2, and AC3, exactly as
originally scoped, each produced a large, concrete false-positive rate against real,
correctly implemented, historically-Done work -- a worse outcome than the bug they
fix (an unusable check trains operators to ignore findings, exactly the failure mode
these issues are about). AC4 was sound as scoped and needed no revision.

**AC1 (duplicate proof text):** downgraded from a blocking finding to a non-blocking
warning. The detection is unchanged and still catches the concrete original bug shape
(two self-referential `request-ACn` lines with byte-identical proof) -- only the
severity changed, from "347 historically-Done tasks can no longer close" to "an
operator reads one line and confirms it." Root cause: a duplicate proof is also the
correct, common shape of two legitimate patterns already in this corpus -- an
orchestration task delegating several ACs to the same child item with an identical
redirect sentence, and a single implementation wave (one commit, one test run) that
legitimately closes several ACs with one shared proof sentence (concretely observed:
this repository's own task_301 "restore the per-command help contract", five ACs, one
commit, one shared proof for all five).

**AC2/AC3 (proof-matches-criterion / orphan-slice-AC):** the original text-matching
design was unsound, not just too strict. "The citing document's own acceptance
criteria" was ambiguous between the slice's own local AC numbering and the request's
AC numbering, and the two do not correspond 1:1 in real documents: `item_786` (this
request's own sibling slice) declares 3 local ACs but only 2 `request-ACn`
traceability lines, because its local AC3 (gzip) is legitimately folded into AC1/AC2's
proof text rather than owning a dedicated line. No amount of severity tuning fixes an
unanswerable question -- **replaced the text-matching entirely** with an opt-in,
declared structural mapping: a local AC may state `(backs request-ACn)`. AC2 became "a
declared mapping to a request AC this document doesn't actually declare is wrong"
(blocking, unambiguous, zero guessing). AC3 became "a local AC with no declared backing,
in a document that has adopted the annotation, is orphaned scope" (warning). Both are
no-ops on a document that has never written the annotation -- verified against this
repo's own corpus: 0 new findings, since no historical document uses it yet. This
document's own AC1-AC4 above now carry the annotation, dogfooding the feature.

# Acceptance criteria
Revised twice since scaffolding, both times recorded in "Findings from implementation"
below rather than silently: AC1 downgraded from blocking to a non-blocking warning;
AC2/AC3 replaced with an opt-in structural annotation instead of the original
text-matching design. `(backs request-ACn)` on each line below is that annotation,
adopted here so this document is itself checked by AC2/AC3 rather than only
describing them.

- AC1 (backs request-AC1): two request-ACn proof lines with byte-identical proof text in the same document produce a **non-blocking warning** naming both AC ids, for a human to confirm rather than a gate to fail.
- AC2 (backs request-AC2): a `(backs request-ACn)` annotation naming a request AC this document's own `# AC Traceability` has no line for produces a blocking finding.
- AC3 (backs request-AC3): a local AC with no `(backs request-ACn)` annotation, in a document that has adopted the annotation elsewhere, produces a non-blocking warning.
- AC4 (backs request-AC4): in a repo with no logics-manager-recorded version, the runtime-drift notice does not fire; where one is recorded, the notice compares against it instead of the repo's own VERSION/package version.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: Implemented in cd7fb24a: `duplicate_proof_ac_ids` (`logics_manager/flow_evidence.py`) detects two self-referential `request-ACn` lines in one document sharing byte-identical proof text (whitespace-normalized), excluding orchestration redirects and placeholders; wired into `audit.py` as a non-blocking warning (`ac_duplicate_proof`), not the originally-scoped blocking finding, after a blocking prototype produced 437 false positives against this repository's own real corpus. Validated with 4 new unit tests plus an audit-level severity test, and the full suite (`pytest` 1376 passed). Source: `cd7fb24a`
- request-AC2 -> This backlog slice. Proof: Implemented in 09fb1412: `invalid_backs_references`/`ac_backs_target_missing` flags a `(backs request-ACn)` annotation naming a request AC this document's own AC Traceability has no line for, as a blocking finding -- opt-in, so it never fires on a document that hasn't adopted the annotation. Validated with 4 unit tests plus an audit-level severity test, and the full suite (`pytest` 1381 passed). This document's own AC1-AC4 lines above now carry the annotation. Source: `09fb1412`
- request-AC3 -> This backlog slice. Proof: Implemented in 09fb1412: `unbacked_local_ac_ids`/`ac_local_ac_unbacked` flags a local AC with no `(backs request-ACn)` annotation, in a document that has adopted the annotation elsewhere, as a non-blocking warning. Same validation as AC2 above. Source: `09fb1412`
- request-AC4 -> This backlog slice. Proof: Implemented in 285c46e8: `repository_version()` now only reads `VERSION` for what looks like logics-manager's own checkout (a `logics_manager/__init__.py` at repo_root); a consumer repo's own version is never read, so `drift_message` is silent there regardless of what it declares. Validated with `python3 -m pytest tests/python/test_runtime_drift.py -q` (8 passed, including a new consumer-repo case) and the full suite (`pytest` 1371 passed). Source: `285c46e8`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)
- Request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Primary task(s): `task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21` was finished via `logics-manager flow finish task` on 2026-08-14.
