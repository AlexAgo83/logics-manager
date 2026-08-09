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

# AI Context
- Summary: Make generated roadmap docs pass the audit they are generated for
- Keywords: backlog-groom, request, make generated roadmap docs pass the audit they are generated for, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Make generated roadmap docs pass the audit they are generated for.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`flow roadmap propose` must produce a document that passes `logics-manager audit`. Today it
`logics index` must title a roadmap with its own title, not with whichever `## ` heading it

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `flow roadmap propose --request-ref req_296` resolves the short form to the full slug on write, or fails with an error naming the unresolvable ref; it never writes a ref the audit will reject.
- AC2: The same resolution applies to `--backlog-ref`, `--task-ref`, and `--product-ref`, and to both the indicator line and the `# References` section.
- AC3: A roadmap document produced by `flow roadmap propose` with resolvable refs passes `logics-manager audit` with zero blocking issues, without hand editing.
- AC4: `logics index` derives `doc_ref` and `title` from the document heading only, and ignores later `## ` headings in the body.
- AC5: `INDEX.md` lists each of `road_001` through `road_007` with its document title (for example "2.15: keeping the viewer alive"), not with a milestone label.
- AC6: A regression test covers a generated roadmap with short refs and more than one milestone, asserting both the audit result and the rendered index row.
- AC7: Promoting a request whose ACs wrap across several lines carries each AC into the backlog item and task in full, not truncated at its first physical line.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `flow roadmap propose --request-ref req_296` either resolves the short form to the full
- request-AC2 -> This backlog slice. Proof: AC2: The same resolution applies to `--backlog-ref`, `--task-ref`, and `--product-ref`, and to
- request-AC3 -> This backlog slice. Proof: AC3: A roadmap document produced by `flow roadmap propose` with resolvable refs passes
- request-AC4 -> This backlog slice. Proof: AC4: `logics index` derives `doc_ref` and `title` from the document heading only, and ignores
- request-AC5 -> This backlog slice. Proof: AC5: `INDEX.md` lists each of `road_001` … `road_007` with its document title (for example
- request-AC6 -> This backlog slice. Proof: AC6: A regression test covers a generated roadmap with short refs and more than one milestone,

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
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for.md`.
- Generated locally by logics-manager.

# Tasks
- `task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`
