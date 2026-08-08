## item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says - Let the indicator gate be cleared by doing what it says
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: A gate with an honest exit
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The gate compares the working tree and the index, and when both are clean it falls back to the last commit. So a document whose last commit carried a body change without an indicator change stays flagged, and no command clears it: re-baselining writes nothing the fallback can see.
- That fallback also explains an observation the reporter could not account for: which documents are flagged changes between runs, because the flagged set is whatever the last commit contained. Re-baselining one document appears to invalidate others.
- The finding also names every indicator the document kind requires rather than the ones missing, which is why `From version` is listed on a document where it was never edited. The message accuses fields the operator never touched.
- The fallback is not gratuitous: it is what catches a commit made without updating indicators. Removing it without a replacement reopens that hole, so this slice owes an answer for that case.

# Scope
- In:
  - Judge the working tree and the index, and stop falling back to the last commit.
  - Say what catches a commit made without updating indicators instead, and put it where a commit is made rather than where a working tree is linted.
  - Name only the indicators actually missing in the finding.
  - Cover the committed-document case, which is where the gate is currently unclearable.
- Out:
  - Weakening what the gate requires of an uncommitted edit.
  - Removing the non-semantic-edit marker, which stays the exit for a genuinely non-semantic change.
  - Changing the re-baseline flag's meaning, which was corrected recently.

# Acceptance criteria
- AC1: A committed document flagged by the gate is cleared by following the remediation the gate prints.
- AC2: Re-baselining one document does not change whether another is flagged.
- AC3: The finding names only the indicators missing on that document.
- AC4: A commit made without updating indicators is still caught, by a stated mechanism.
- AC5: Tests cover the committed document and the commit-time case, and fail against the current implementation.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: `test_a_committed_document_is_not_flagged_by_the_working_tree_gate` and `test_the_commit_check_still_catches_it` in `tests/python/test_gate_you_can_satisfy.py`.
- request-AC6 -> This backlog slice. Proof: `test_the_finding_names_only_indicators_a_remediation_can_change` in the same file; `From version` and `Schema version` are no longer named.
- request-AC8 -> This backlog slice. Proof: the three tests above, plus `logics-manager lint --commit <ref>` documented in `docs/cli.md`.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Primary task(s): `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# AI Context
- Summary: Let the indicator gate be cleared by doing what it says
- Keywords: scaffolded-backlog, let the indicator gate be cleared by doing what it says, implementation-ready
- Use when: Implementing the scaffolded slice for Let the indicator gate be cleared by doing what it says.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - no sequence of commands clears it on a committed document
- Rationale: Set by scaffold input or defaulted for grooming.
