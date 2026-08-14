## task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21 - Orchestrate flow traceability and self-consistency fixes (GH #20, #21)
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 23:17:12
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
- [x] 2. Implement the proof-must-match-a-real-AC check (backlog AC2) — the original text-matching design was replaced entirely with an opt-in `(backs request-ACn)` structural annotation: a declared mapping to a request AC the document doesn't actually declare is a blocking finding. Shipped.
- [x] 3. Implement the orphaned-slice-AC warning (backlog AC3) — same annotation: a local AC with no `(backs ...)` in a document that has adopted it elsewhere is a non-blocking warning. Shipped.
- [x] 4. Point runtime-drift at a logics-manager-recorded version and silence it otherwise (backlog AC4) — done: gated on self-repo detection (a `logics_manager/__init__.py` at repo_root), the cheaper of the two options the source issue offered.
- [x] 5. Make flow start/repair/closeout re-baseline indicators on every document they write (backlog AC5) — done.
- [x] 6. Update the companion_doc_missing_mermaid finding text for product documents (backlog AC6) — done, and generalized to every companion kind `flow repair mermaid` refuses (architecture included, not just product).
- [x] 7. Validate the full chain with flow validate, lint --require-status, and a manual replay of the two issues' repro steps — done for AC4/5/6; AC1/2/3 have no fix to replay against.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass — all 6 ACs now real; lint OK, audit 0 blocking, flow validate clean.

# Backlog
- `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`
- `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof: see that item's AC Traceability.
- request-AC2 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof: see that item's AC Traceability.
- request-AC3 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof: see that item's AC Traceability.
- request-AC4 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof: see that item's AC Traceability.
- request-AC5 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof: see that item's AC Traceability.
- request-AC6 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof: see that item's AC Traceability.

# Validation
- `python3 -m pytest tests/python/ -q` — 1382 passed (full suite, includes all six ACs' new/updated tests).
- `npx vitest run` — 929 passed (unaffected by this task's changes).
- `python3 -m ruff check logics_manager/audit.py logics_manager/flow/__init__.py logics_manager/runtime_drift.py logics_manager/flow_evidence.py` — clean.
- Manual replay against this repo's own corpus: `python3 -m logics_manager audit --group-by-doc` shows the new `companion_doc_missing_mermaid` wording live on `prod_093`'s existing warning, the `ac_duplicate_proof` warning at 437 hits, and 0 new findings from the `(backs request-ACn)` checks (opt-in; no historical document uses the annotation). 0 blocking overall.
- `python3 -m logics_manager flow validate req_357_...` — only expected deferred findings. `lint --require-status` — OK.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- All six ACs delivered. AC4 (runtime-drift self-repo gating), AC5 (indicator rebaseline on flow start/repair/closeout), AC6 (mermaid finding wording) shipped as originally scoped.
- AC1 (duplicate-proof-text) shipped as a non-blocking warning after a blocking prototype produced 437 false positives against this repo's own real corpus (orchestration-delegation and single-wave multi-AC proof patterns). Same detection, different severity.
- AC2/AC3 (proof-matches-criterion / orphan-slice-AC) had no safe severity downgrade -- their ambiguity was in the check itself (slice-local AC numbering vs request AC numbering don't correspond 1:1 in real documents, e.g. item_786). Resolved by replacing the text-matching design entirely with an opt-in `(backs request-ACn)` structural annotation, checked as a declared graph rather than guessed from prose. Verified against the real corpus: 0 new findings, since it's opt-in and no historical document has adopted it. item_784 itself now carries the annotation, dogfooding the feature -- which caught a real bug (a missing `re.MULTILINE` that made the check blind past the first line of a multi-line section) before it shipped.
- This task, item_784, item_785, and req_357 are closed: all six ACs are proven, `flow validate`/`lint`/`audit` are clean.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`, `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`
- Related request(s): `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`

# Links
- Request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)
