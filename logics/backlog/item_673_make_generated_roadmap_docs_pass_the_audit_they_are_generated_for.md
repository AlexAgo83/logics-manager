## item_673_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for - Make generated roadmap docs pass the audit they are generated for
> From version: 2.21.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 00:17:16

# AI Context
- Summary: Make generated roadmap docs pass the audit they are generated for
- Keywords: backlog-groom, request, make generated roadmap docs pass the audit they are generated for, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Make generated roadmap docs pass the audit they are generated for.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Three document-generation commands write content the runtime then rejects or misreads. All three were found on 2026-08-09 while authoring the first seven roadmap docs, and all three are one subsystem: generation that never checks its own output.

1. `flow roadmap propose` formats `--request-ref` verbatim (`logics_manager/flow/docs.py:808`) with no resolution and no validation, while `extract_refs` requires the full slug (`logics_manager/doc_parsing.py:45`). A short `req_296` never matches, so `logics_manager/audit.py:752` raises `companion_doc_missing_primary_link` as BLOCKING. All seven generated roadmaps failed `npm run ci:check` on their first audit.
2. `logics_manager/index.py:44-52` reassigns `doc_ref` and `title` on every `## ` line, with `continue` rather than `break`, so a roadmap is indexed under its last milestone. Not roadmap-specific: any doc kind whose body uses `## X - Y` sub-headings is affected.
3. `flow promote` copies only the first physical line of a wrapped acceptance criterion. `task_321` was created asserting `AC1: ... either resolves the short form to the full`. This backlog item's own Problem and AC Traceability sections were truncated the same way, by the same code path.

Kept as one slice rather than three: each fix is a few lines, they share one regression-test file, and they are the same defect wearing three hats.

# Scope
- In:
  - Resolve short refs to full slugs in `flow roadmap propose`, or fail naming the unresolvable ref — never write a ref the audit rejects. Apply to `--request-ref`, `--backlog-ref`, `--task-ref`, `--product-ref`, in both the indicator line and `# References`.
  - Derive `doc_ref` and `title` in `index.py` from the document heading only, ignoring later `## ` headings.
  - Carry a wrapped acceptance criterion into the derived doc in full in `flow promote`, and apply the same to the `# Problem` section it builds from the request's `# Needs`.
  - One regression test covering a generated roadmap with short refs and several milestones, asserting the audit result and the rendered index row; one covering a promote with multi-line ACs.
  - Regenerate `INDEX.md` and review the diff — the heading change affects every doc kind.
- Out:
  - The content of `road_001` through `road_007`: corrected by hand, committed, green. Not to be rewritten.
  - Changing the ref pattern in `doc_parsing.py`. Full slugs are the convention; the generators are what is wrong.
  - The exit-code findings in `req_326` and the diagnostics findings in `req_325`.

# Acceptance criteria
- AC1: `flow roadmap propose --request-ref req_296` resolves the short form to the full slug on write, or fails with an error naming the unresolvable ref; it never writes a ref the audit will reject.
- AC2: The same resolution applies to `--backlog-ref`, `--task-ref`, and `--product-ref`, and to both the indicator line and the `# References` section.
- AC3: A roadmap document produced by `flow roadmap propose` with resolvable refs passes `logics-manager audit` with zero blocking issues, without hand editing.
- AC4: `logics index` derives `doc_ref` and `title` from the document heading only, and ignores later `## ` headings in the body.
- AC5: `INDEX.md` lists each of `road_001` through `road_007` with its document title (for example "2.15: keeping the viewer alive"), not with a milestone label.
- AC6: A regression test covers a generated roadmap with short refs and more than one milestone, asserting both the audit result and the rendered index row.
- AC7: Promoting a request whose ACs wrap across several lines carries each AC into the backlog item and task in full, not truncated at its first physical line.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: deferred to task closeout.
- request-AC2 -> This backlog slice. Proof: deferred to task closeout.
- request-AC3 -> This backlog slice. Proof: deferred to task closeout.
- request-AC4 -> This backlog slice. Proof: deferred to task closeout.
- request-AC5 -> This backlog slice. Proof: deferred to task closeout.
- request-AC6 -> This backlog slice. Proof: deferred to task closeout.
- request-AC7 -> This backlog slice. Proof: deferred to task closeout.

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
- Request: `logics/request/req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for.md`
- Primary task(s): `task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`

# Priority
- Priority: Medium
- Rationale: Set while scoping req_324's generation defects.

# Notes
- Hybrid rationale: Derived from request `req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for.md`.
- Generated locally by logics-manager.

# Tasks
- `task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`
