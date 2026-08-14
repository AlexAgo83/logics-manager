## task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21 - Orchestrate flow traceability and self-consistency fixes (GH #20, #21)
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 23:01:23
> Owner: claude

# AI Context
- Summary: Orchestrates item_784 (traceability proof-content checks + runtime-drift fix) and item_785 (flow's own writes re-baselining indicators + Mermaid finding wording) in the priority order set by req_357.
- Keywords: orchestration, flow-integrity, GH #20, GH #21
- Use when: Sequencing or tracking overall progress across item_784 and item_785.
- Skip when: Implementation detail of either backlog item — see them directly.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Implement the duplicate-proof-text check (backlog AC1) — first attempt as a blocking finding was tested against the real corpus and reverted (437 false positives against legitimate historical work); shipped as a non-blocking warning instead, same detection, operator confirms rather than a gate failing. See item_784's "Findings from implementation" for the evidence and resolution.
- [ ] 2. Implement the proof-must-match-a-real-AC check (backlog AC2) — not built: the same ambiguity that broke AC1 (slice-local vs request AC numbering don't correspond 1:1) makes literal matching unsafe here too, confirmed against a real sibling document (item_786) before writing any code.
- [ ] 3. Implement the orphaned-slice-AC warning (backlog AC3) — not built, same reason as AC2.
- [x] 4. Point runtime-drift at a logics-manager-recorded version and silence it otherwise (backlog AC4) — done: gated on self-repo detection (a `logics_manager/__init__.py` at repo_root), the cheaper of the two options the source issue offered.
- [x] 5. Make flow start/repair/closeout re-baseline indicators on every document they write (backlog AC5) — done.
- [x] 6. Update the companion_doc_missing_mermaid finding text for product documents (backlog AC6) — done, and generalized to every companion kind `flow repair mermaid` refuses (architecture included, not just product).
- [x] 7. Validate the full chain with flow validate, lint --require-status, and a manual replay of the two issues' repro steps — done for AC4/5/6; AC1/2/3 have no fix to replay against.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass — item_784/AC1-3 remain open; this task and req_357 stay In progress rather than closing over unimplemented, undecided scope.

# Backlog
- `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`
- `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC2 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC3 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC4 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC5 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof deferred to slice closeout.
- request-AC6 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof deferred to slice closeout.

# Validation
- `python3 -m pytest tests/python/ -q` — 1376 passed (full suite, includes AC1/4/5/6's new/updated tests).
- `npx vitest run` — 929 passed (unaffected by this task's changes).
- `python3 -m ruff check logics_manager/audit.py logics_manager/flow/__init__.py logics_manager/runtime_drift.py logics_manager/flow_evidence.py` — clean.
- Manual replay against this repo's own corpus: `logics-manager audit --group-by-doc` shows the new `companion_doc_missing_mermaid` wording live on `prod_093`'s existing warning, and the new `ac_duplicate_proof` warning at 437 hits, 0 blocking (`audit_payload["ok"] is True`).

# Report
- Delivered AC1 (duplicate-proof-text, shipped as a non-blocking warning after a blocking prototype produced 437 false positives against this repo's own real corpus), AC4 (runtime-drift self-repo gating), AC5 (indicator rebaseline on flow start/repair/closeout), AC6 (mermaid finding wording) -- see item_784 and item_785 for per-AC proof.
- AC2/AC3 (traceability proof-content checks) are not shipped and have no equivalent safe downgrade: their ambiguity is in the check itself (slice-local AC numbering vs request AC numbering don't correspond 1:1 in real documents, confirmed against a real sibling document, item_786), not in its severity, so unlike AC1 there's no "make it a warning" fix available.
- This is a genuine scope gap, not an oversight: shipping AC2/AC3 as originally specified would introduce the same kind of corpus-wide false-positive regression AC1 hit, on a check with no severity dial to soften it.
- This task, item_784, and req_357 are left In progress rather than closed, since 2 of 6 ACs (AC2, AC3) remain open pending a design decision (a structural slice-AC-to-request-AC mapping, most likely).

# Links
- Request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)
