## item_785_stop_flow_s_own_writes_from_tripping_its_own_checks - Stop flow's own writes from tripping its own checks
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: flow-integrity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 22:01:31

# AI Context
- Summary: Make `flow start`/`repair`/`closeout` re-baseline the indicators of documents they write, and clarify the `companion_doc_missing_mermaid` finding for product docs so it names the hand-authoring path `flow repair mermaid` refuses.
- Keywords: indicator rebaseline, sync update-indicators --touch, companion_doc_missing_mermaid, flow repair mermaid
- Use when: Implementing this backlog item.
- Skip when: The traceability proof-content issue (item_784) — separate concern.

# Problem
- flow start/repair/closeout write a document's body but not its indicator baseline, so the next lint --require-status run flags the tool's own edit as 'modified without updating indicators' and the prescribed remedy is run against the tool's own output.
- The companion_doc_missing_mermaid audit finding fires identically for product documents even though flow repair mermaid explicitly and correctly refuses to touch them, leaving the operator to guess that the diagram must be hand-authored.

# Scope
- In:
  - flow start/repair/closeout re-baselining Confidence/Progress/Understanding on every document they write, equivalent to an internal sync update-indicators --touch call.
  - Amending the companion_doc_missing_mermaid finding text for product documents to state the diagram is hand-authored and name flow repair mermaid's refusal.
- Out:
  - Tracking a general writer/author-of-edit metadata field on documents — the re-baseline-on-write is sufficient and simpler.
  - Changing companion_doc_missing_mermaid's severity or suppressing it for product docs.

# Acceptance criteria
- AC1: running flow start (or repair, or closeout) on a document followed by lint --require-status produces no 'modified without updating indicators' finding for that document.
- AC2: the companion_doc_missing_mermaid finding text, when raised against a product document, includes '(authored by hand; flow repair mermaid does not generate product diagrams)' or equivalent wording.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: running flow start (or repair, or closeout) on a document followed by lint --require-status produces no 'modified without updating indicators' finding for that document.
- request-AC6 -> This backlog slice. Proof: AC2: the companion_doc_missing_mermaid finding text, when raised against a product document, includes '(authored by hand; flow repair mermaid does not generate product diagrams)' or equivalent wording.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)
- Request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Primary task(s): `task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
