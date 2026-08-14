## item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive - Validate traceability proof content and fix the runtime-drift false positive
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: flow-integrity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: validate, traceability, proof, content, fix, runtime, drift, false, positive
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

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

# Acceptance criteria
- AC1: two request-ACn proof lines with byte-identical proof text in the same document produce a blocking finding.
- AC2: a request-ACn proof line whose text does not match (exact/strict) any acceptance criterion declared by the citing document produces a blocking finding.
- AC3: a slice acceptance criterion backing no request AC produces a non-blocking warning.
- AC4: in a repo with no logics-manager-recorded version, the runtime-drift notice does not fire; where one is recorded, the notice compares against it instead of the repo's own VERSION/package version.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: two request-ACn proof lines with byte-identical proof text in the same document produce a blocking finding.
- request-AC2 -> This backlog slice. Proof: AC2: a request-ACn proof line whose text does not match (exact/strict) any acceptance criterion declared by the citing document produces a blocking finding.
- request-AC3 -> This backlog slice. Proof: AC3: a slice acceptance criterion backing no request AC produces a non-blocking warning.
- request-AC4 -> This backlog slice. Proof: AC4: in a repo with no logics-manager-recorded version, the runtime-drift notice does not fire; where one is recorded, the notice compares against it instead of the repo's own VERSION/package version.

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
