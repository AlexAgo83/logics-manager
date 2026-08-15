## req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy - Make flow's traceability checks and self-authored writes trustworthy
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: flow-integrity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 23:18:29

# AI Context
- Summary: `flow` validates traceability by presence only (a wrong or duplicated proof passes) and its own write commands (`start`/`repair`/`closeout`) trip lint's own indicator check on their own output — two GitHub issues (#20, #21) about the checking half and the writing half disagreeing on what a valid document is.
- Keywords: flow, traceability proof, ac_proof_state, runtime-drift, indicator rebaseline, companion_doc_missing_mermaid
- Use when: Changing traceability validation/repair logic, the runtime-drift version check, or how flow's own write commands leave a document's indicators.
- Skip when: Anything about the viewer server or client performance — that's req_358.

# Needs
- As an operator running flow validate/lint/audit, I need traceability content to be checked, not just its presence, so a closeout gate cannot certify fictional proof.
- As an operator running flow in a consumer repo, I need the runtime-drift notice to compare against a version logics-manager itself recorded, so it stops firing falsely against the consumer's own package version.
- As an operator running flow start/repair/closeout, I need those commands to re-baseline the indicators they just wrote, so lint does not flag the tool's own output as an unreviewed hand edit.
- As an operator reading an audit finding about a missing product Mermaid diagram, I need the finding to say the diagram is hand-authored, so I do not go looking for a repair command that will refuse it.

# Context
- GitHub issue #20: flow validate accepts traceability whose proof text is wrong, and the runtime-drift notice is false in consumer repos.
- GitHub issue #21: flow flags and refuses states that its own commands create (indicator baseline after tool writes, and product Mermaid repair refusal with no pointer to the hand-authoring path).
- Both issues were found running a full /corpus -> /implement-task cycle on a consumer repo (cdx-manager) at runtime 2.21.9 and confirmed still present on main at that version.
- Prior closed issues #12-#19 already hardened traceability/indicator mechanics; these two continue that same thread rather than opening a new one.
- New evidence found live while closing out req_358 (this repo, 2026-08-14), same bug family as #20's third comment: `validate_closeout_payload` (`logics_manager/flow/__init__.py:516-526`) resolves ALL of the parent request's AC ids, but checks proof only against the CURRENT task's own linked backlog item(s) — not every backlog item/task linked anywhere in the request. On a request split into two backlog items (item_786+task_358 covering AC1/AC2, item_787+task_359 covering AC3), closing task_358 demanded proof for AC3 and closing task_359 demanded proof for AC1/AC2, even though every AC already had real proof in its own task. `flow close task` then made it worse: it appended blocking `Proof:` placeholders (the literal unfilled-evidence marker text) for those out-of-scope ACs into both tasks (removed by hand rather than filled, since they didn't belong there). `audit.py`'s own equivalent check (`_doc_has_ac_with_proof` over `linked_items`/`linked_tasks` resolved from the whole request, `logics_manager/audit.py:1053-1080`) does this aggregation correctly — `validate_closeout_payload` needs the same fix: resolve `item_paths`/task proof targets from every backlog item linked to the request, not only the ones the current task references.

# Acceptance criteria
- AC1: flow validate/repair reject or flag a request-ACn proof line whose text is identical to another request-ACn proof line in the same document (anti copy-paste), as a blocking finding.
- AC2: flow validate/repair reject or flag a request-ACn proof line whose proof text does not correspond to any acceptance criterion actually declared by the citing document, as a blocking finding.
- AC3: flow validate warns (non-blocking) when a slice's own acceptance criterion backs no request AC (orphaned slice AC).
- AC4: the runtime-drift notice compares the running version against a version logics-manager itself recorded (e.g. in logics.yaml), and stays silent when no such version is recorded, instead of reading the consumer repo's own VERSION/package version.
- AC5: flow start, flow repair, and flow closeout re-baseline the Confidence/Progress/Understanding indicators of every document they write, so a subsequent lint --require-status run does not flag that document as modified without updating indicators.
- AC6: the companion_doc_missing_mermaid audit finding, when raised against a product document, states that the diagram is authored by hand and that flow repair mermaid does not generate it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)

# References
- https://github.com/AlexAgo83/logics-manager/issues/20
- https://github.com/AlexAgo83/logics-manager/issues/21

# Backlog
- `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`
- `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`

# Provenance
- Origin: `human`
- External id: `#20`
- External issue: https://github.com/AlexAgo83/logics-manager/issues/20
- Approval: required before implementation starts.
