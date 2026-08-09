## task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for - Make generated roadmap docs pass the audit they are generated for
> From version: 2.21.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement make generated roadmap docs pass the audit they are generated for.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_673_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`

# Acceptance criteria
- AC1: `flow roadmap propose --request-ref req_296` resolves the short form to the full slug on write, or fails with an error naming the unresolvable ref; it never writes a ref the audit will reject.
- AC2: The same resolution applies to `--backlog-ref`, `--task-ref`, and `--product-ref`, and to both the indicator line and the `# References` section.
- AC3: A roadmap document produced by `flow roadmap propose` with resolvable refs passes `logics-manager audit` with zero blocking issues, without hand editing.
- AC4: `logics index` derives `doc_ref` and `title` from the document heading only, and ignores later `## ` headings in the body.
- AC5: `INDEX.md` lists each of `road_001` through `road_007` with its document title (for example "2.15: keeping the viewer alive"), not with a milestone label.
- AC6: A regression test covers a generated roadmap with short refs and more than one milestone, asserting both the audit result and the rendered index row.
- AC7: Promoting a request whose ACs wrap across several lines carries each AC into the backlog item and task in full, not truncated at its first physical line.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_321_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
