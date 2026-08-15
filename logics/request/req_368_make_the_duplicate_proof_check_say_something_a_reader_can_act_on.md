## req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on - Make the duplicate-proof check say something a reader can act on
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Audit signal quality
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:27:56

# AI Context
- Summary: `ac_duplicate_proof` was all 437 of the audit's warnings, on 122 documents, every one of them closed. Keep the signal, stop paying for it.
- Keywords: audit signal, duplicate proof, false positives, warning fatigue
- Use when: A check reports the normal case and the report stops being read.
- Skip when: The check finds real defects at a rate worth its volume.

# Needs
- As an operator running an audit, I need its warnings to be findings I can act on, so that a report with warnings in it is worth opening.
- As an operator, I need a shared implementation wave to be stated once rather than once per pair of criteria it covers.
- As an operator, I need to be able to say 'yes, this proof is shared on purpose' and not be asked again.

# Context
- `ac_duplicate_proof` produces 437 warnings across 122 documents on this corpus -- every warning the audit currently reports. Collapsed by shared proof text they are 127 groups, mean 4.4 criteria per group and 12 at the largest, so one wave that legitimately closed twelve criteria is reported eleven times.
- This is not a regression. `duplicate_proof_ac_ids`'s own docstring records that a blocking prototype produced exactly 437 false positives against two legitimate patterns -- an orchestration task delegating several criteria to the same child, and one implementation wave closing several criteria with one proof -- and that it was wired in as a warning 'for a human to confirm' for that reason. The human is never going to confirm 437 of them.
- A warning that fires on the normal case is how a report teaches itself to be skimmed. The audit already articulates this concern about a different check: `_lineage_issues`'s docstring says nagging about two hundred closed documents 'is how a report teaches itself to be skimmed'.
- The check already excludes the orchestration-redirect shape by scoping to self-referencing targets. What is left is dominated by the second legitimate pattern, which the check has no way to tell from a shifted or copy-pasted block.
- A sibling defect was just fixed in the same report: `code_anchor_symbol_not_found` asked the codebase whether `req_367_...` existed, while `SKIP_DIRS` excludes `logics` from the blob on purpose. Twelve warnings, all of them the check misreading lineage as a code citation. Same shape: a check firing on a case it was never about.
- The signal the check exists for is real -- item_784/GH#20 found two criteria carrying the same proof where one of them was necessarily wrong. The aim is to keep that and stop paying for it 437 times.

# Acceptance criteria
- AC1: A shared proof covering several criteria is reported once, naming every criterion it covers, rather than once per pair.
- AC2: A document can state that a shared proof is deliberate, and that document stops being reported without the check being disabled anywhere else.
- AC3: The case item_784 was built for -- one proof block shifted or copy-pasted across criteria that do not share a wave -- is still reported.
- AC4: After this work the audit's warning count on this corpus reflects things worth reading, and what remains is stated with its number rather than left implied.
- AC5: No check in this audit reports the normal case as a finding: any check whose warning count is dominated by a legitimate pattern is either narrowed or acknowledged, and the reasoning is recorded where the check lives.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_093_trustworthy_flow_checks.md
- logics/backlog/item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive.md
- logics_manager/flow_evidence.py
- logics_manager/audit.py
- logics_manager/code_anchors.py

# Backlog
- `item_821_report_a_shared_proof_once_not_once_per_pair`
- `item_822_let_a_document_settle_a_deliberate_shared_proof`
- `item_823_prove_the_check_still_finds_what_it_was_built_for`
- `item_824_say_what_the_audit_s_remaining_warnings_are`
