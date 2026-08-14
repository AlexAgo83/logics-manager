## item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive - Validate traceability proof content and fix the runtime-drift false positive
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: flow-integrity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 22:48:40

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

# Findings from implementation (AC1/AC2/AC3 not shipped -- see below)
AC4 is implemented and proven. AC1-AC3, as scoped above, were built, tested against
this repository's own real corpus (1497 docs, 350+ Done tasks), and reverted before
commit: each produces a large, concrete false-positive rate against real, correctly
implemented, historically-Done work, which is a worse outcome than the bug they fix
(an unusable check trains operators to ignore findings -- exactly the failure mode
these issues are about).

- **AC1 (duplicate proof text) is unsafe as scoped.** A duplicate `request-ACn` proof
  is not only produced by a shift/copy-paste bug; it is also the correct, common
  shape of two other patterns already in this corpus: (a) an orchestration task
  delegating several request ACs to the *same* child item, where the redirect
  sentence ("see that item's AC Traceability") is deliberately identical across every
  AC that child covers; (b) a single implementation wave (one commit, one test run)
  that legitimately closes several ACs at once with one shared validation sentence
  (concretely observed: this repository's own task_301 "restore the per-command help contract",
  five ACs, one commit, one shared "Implemented in commit 0086e92a..." proof for all
  five). A prototype scoped to lines whose target is the doc's own self-reference
  (`This task.`/`This backlog slice.`, excluding orchestration redirects) still
  produced 437 blocking false positives across the existing corpus when run for
  real -- confirmed by inspecting several by hand, all legitimate.
- **AC2/AC3 share the same root ambiguity, found before a prototype was even run.**
  "The citing document's own acceptance criteria" is ambiguous between the slice's
  own local AC numbering and the request's AC numbering, and the two do not
  correspond 1:1 in real documents: `item_786` (this same request's own sibling
  slice) declares 3 local ACs but only 2 `request-ACn` traceability lines -- its
  local AC3 (gzip) is legitimately covered inside AC1/AC2's proof text, not by a
  dedicated line. A literal "every declared AC must have its own request-ACn line"
  check (AC3 as scoped) would immediately warn on that real, correctly-implemented
  document. A literal "proof text must appear in the citing doc's own AC section"
  check (AC2 as scoped) would fail on essentially every well-written evidence-based
  proof in this codebase, none of which quote their AC verbatim (they describe
  implementation + validation commands instead, e.g. this very item's AC4 proof
  below).

**Recommendation, not shipped:** either check needs a design that distinguishes
"one proof legitimately covers several/delegates" from "proof was shifted/invented,"
which the plain string-matching rules originally scoped cannot do without either a
structural field this document format doesn't have (an explicit slice-AC-to-request-AC
map) or semantic judgment (explicitly out of scope per the original ask: "no
semantics, no new doc structure, no LLM"). Left open for a follow-up scoping
decision rather than shipped broken or silently dropped.

# Acceptance criteria
- AC1: two request-ACn proof lines with byte-identical proof text in the same document produce a blocking finding.
- AC2: a request-ACn proof line whose text does not match (exact/strict) any acceptance criterion declared by the citing document produces a blocking finding.
- AC3: a slice acceptance criterion backing no request AC produces a non-blocking warning.
- AC4: in a repo with no logics-manager-recorded version, the runtime-drift notice does not fire; where one is recorded, the notice compares against it instead of the repo's own VERSION/package version.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: two request-ACn proof lines with byte-identical proof text in the same document produce a blocking finding.
- request-AC2 -> This backlog slice. Proof: AC2: a request-ACn proof line whose text does not match (exact/strict) any acceptance criterion declared by the citing document produces a blocking finding.
- request-AC3 -> This backlog slice. Proof: AC3: a slice acceptance criterion backing no request AC produces a non-blocking warning.
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
