## req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for - Make generated roadmap docs pass the audit they are generated for
> Indicators reviewed: 2026-08-10 00:17:05

> From version: 2.21.2
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: M
> Theme: Roadmap generation and indexing
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context

- Summary: Three generation defects found by authoring the first seven real roadmap docs — `flow roadmap propose` writes refs the audit rejects, `logics index` titles a roadmap with its last milestone, and promotion truncates a wrapped acceptance criterion.
- Keywords: roadmap, propose, audit, extract_refs, INDEX, doc_ref, companion_doc_missing_primary_link
- Use when: Working on roadmap document generation, ref resolution, or the corpus index renderer.
- Skip when: You need the content of the 2.15–2.21 roadmap docs themselves.

# Needs

- `flow roadmap propose` must produce a document that passes `logics-manager audit`. Today it
  accepts `--request-ref req_296`, writes `` `req_296` `` verbatim, and that form does not match
  the ref pattern the audit uses, so every generated roadmap is BLOCKING on arrival.
- `logics index` must title a roadmap with its own title, not with whichever `## ` heading it
  read last.
- `flow promote` must carry a full acceptance criterion into the derived doc, whatever its line
  wrapping.

# Context

- Found on 2026-08-09 while authoring `road_001` … `road_007`, the first seven roadmap
  documents in this corpus. All three were invisible until a roadmap doc existed with real
  refs and more than one milestone, and a request was promoted with prose-length ACs.
- **Defect 1 — short refs are written but not accepted.**
  `logics_manager/flow/docs.py:808` formats whatever `--request-ref` was given:
  `", ".join(f"`{ref}`" for ref in request_refs)`. No resolution, no validation.
  `logics_manager/doc_parsing.py:45` matches refs with `rf"\b{prefix}_\d+_[a-z0-9_]+\b"`, which
  requires the full slug. `req_296` never matches, so `_extract_refs` returns nothing, and
  `logics_manager/audit.py:752` raises `companion_doc_missing_primary_link` as BLOCKING for a
  mature companion doc. All seven generated roadmaps failed `npm run ci:check` on their first
  audit; expanding the refs to full slugs by hand cleared it.
- **Defect 2 — the index reads the last heading, not the first.**
  `logics_manager/index.py:44-52` iterates every line starting with `## ` and reassigns both
  `doc_ref` and `title` each time, with `continue` rather than `break`. A roadmap's milestones
  are written as `## 2.15.7 - crash post-mortems`, which is the same `<ref> - <title>` shape as
  the document heading, so the last milestone wins. `INDEX.md` currently lists
  `road_001_2_15_keeping_the_viewer_alive` as "2.15.7 / crash post-mortems".
  This is not roadmap-specific: any doc kind whose body uses `## X - Y` sub-headings is
  affected. Roadmaps are simply the first kind whose template generates them.
- **Defect 3 — promotion truncates a wrapped acceptance criterion.**
  This request's ACs were first written wrapped across several lines. `flow promote
  request-to-backlog` and `flow promote backlog-to-task` copied only the first physical line of
  each, so `task_321` was created asserting `AC1: ... either resolves the short form to the full`
  — a sentence ending mid-clause. Found by reading the generated task; nothing reported it. The
  ACs in this chain were rewritten as single lines to work around it.
- All three defects are instances of the theme the 2.19.6 and 2.21.0 releases already named: a
  command reporting success for output it has not checked.

# Acceptance criteria

- AC1: `flow roadmap propose --request-ref req_296` resolves the short form to the full slug on write, or fails with an error naming the unresolvable ref; it never writes a ref the audit will reject.
- AC2: The same resolution applies to `--backlog-ref`, `--task-ref`, and `--product-ref`, and to both the indicator line and the `# References` section.
- AC3: A roadmap document produced by `flow roadmap propose` with resolvable refs passes `logics-manager audit` with zero blocking issues, without hand editing.
- AC4: `logics index` derives `doc_ref` and `title` from the document heading only, and ignores later `## ` headings in the body.
- AC5: `INDEX.md` lists each of `road_001` through `road_007` with its document title (for example "2.15: keeping the viewer alive"), not with a milestone label.
- AC6: A regression test covers a generated roadmap with short refs and more than one milestone, asserting both the audit result and the rendered index row.
- AC7: Promoting a request whose ACs wrap across several lines carries each AC into the backlog item and task in full, not truncated at its first physical line.

# Definition of Ready (DoR)

- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope

- In: `flow roadmap propose` ref handling; AC extraction in `flow promote`; ref resolution shared with other `flow new`/companion
  commands if the fix naturally belongs there; `index.py` heading parsing; regression tests.
- Out: The content of the existing roadmap documents — they were corrected by hand and are
  already committed and green. Rewriting them is not part of this work.
- Out: Changing the ref pattern in `doc_parsing.py`. Full slugs are the convention; the
  generator is what is wrong.

# Risks

- Changing `index.py` heading parsing affects every doc kind. Some existing doc may be relying,
  accidentally, on the last-heading behaviour to get a title it likes. Regenerating `INDEX.md`
  and reviewing the diff is the check.
- Resolving short refs requires reading the corpus at propose time, which the command may not do
  today. Failing loudly on an unresolvable ref is acceptable and preferable to writing it.

# Companion docs

- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References

- `logics_manager/flow/docs.py`
- `logics_manager/doc_parsing.py`
- `logics_manager/index.py`
- `logics_manager/audit.py`
- `tests/python/test_logics_manager_cli.py`
- Evidence: `road_001_2_15_keeping_the_viewer_alive`, `road_007_2_21_evidence_over_assertion`

# Backlog
- `item_673_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`
