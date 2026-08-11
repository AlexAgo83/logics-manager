## req_337_stop_reading_a_mentioned_reference_as_a_lineage_link - Stop reading a mentioned reference as a lineage link
> From version: 2.21.6
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Corpus lineage
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Lineage is derived by scanning a document's whole text for reference tokens, so citing prior art in prose adopts it as a parent — and because acceptance proof is then matched by AC id alone, an unrelated chain's AC1 can satisfy this one's AC1.
- Keywords: lineage, false-linkage, ac-traceability, ac-id-collision, audit
- Use when: Changing how parent/child links are derived, or diagnosing a traceability finding that names an AC you never linked.
- Skip when: The work concerns the severity or wording of a finding rather than which documents it was computed from.

# Needs
- A document must be able to name prior art without inheriting it. Today it cannot: mentioning another chain's reference anywhere in the body — a sentence of context, a line under `# References` — makes that chain a parent for audit purposes.
- Two consequences, and the second is the dangerous one.
- **Lifecycle is inherited from a stranger.** Deferred findings become blocking as soon as *any* linked task is Done. Citing a finished chain therefore flips a brand-new Draft request's findings from "expected at closeout" to "blocking", for work nobody has started.
- **Proof is inherited from a stranger.** Because proof is matched by AC identifier only, an unrelated linked document that proved its own `AC1` through `AC4` silently satisfies this request's `AC1` through `AC4`. They are different criteria that happen to share a numbering scheme.
- Observed 2026-08-11 while filing a request about audit reporting. It cited the earlier lifecycle-aware-findings work as prior art. The audit reported exactly one blocking finding — its `AC5` — because the cited chain had proved four criteria and stopped there. Four unproven criteria read as proven, and the one that surfaced did so for a reason unrelated to its own state. The workaround was to delete the citation, which is the wrong direction: it makes the corpus poorer to keep the audit honest.
- Silence is what makes this severe. Nothing reports that a link was inferred, so a false parent is invisible until it changes an outcome — and when it hides a gap rather than inventing one, it never changes an outcome at all.

# Context
- `_linked_items_for_request` in `logics_manager/audit.py` calls `_extract_refs(request.text, ...)` over the **entire document text**, with no notion of which section the reference appeared in.
- `_linked_tasks_for_item` is looser still: `if item.ref in doc.text`, a plain substring test over the whole task document.
- `_doc_has_ac_with_proof(doc, ac_id)` matches on the AC identifier alone. Combined with the above, proof crosses chain boundaries whenever ids coincide — and ids always coincide, because every document numbers from `AC1`.
- The corpus already distinguishes structural links from prose: requests carry `# Backlog`, tasks carry `# Links`, items carry their request. Those sections are the declared lineage; the text scan is a second, undeclared one that disagrees with it.
- Scope: how lineage is computed for validation, and how proof is matched once lineage is known. Out of scope: the severity model for traceability findings, the wording of any finding, and any change to document schema or existing documents.
- **Order it before `req_333` and `req_338`.** `req_333` hides deferred findings, and whether a finding is deferred is computed from the very links this request corrects — hiding first would hide the miscomputation too. `req_338` composes traceability entries from per-criterion records, and this request decides which chain a criterion's proof may come from; both touch `_ac_traceability_entry` in `logics_manager/flow/docs.py`. This is the root of the cluster and should land first.
- Known risk: some existing documents may rely on the loose scan, declaring a parent only in prose. A migration that tightens the rule silently would drop their lineage. The tightening must therefore report what it stopped counting rather than quietly recompute.

# Acceptance criteria
- AC1: Lineage is derived only from the declared link sections of a document; a reference appearing in narrative prose does not create a parent or child relationship.
- AC2: A document may cite any other document by reference in its body without changing its own findings, its lifecycle state, or its proof coverage.
- AC3: Acceptance proof is matched within the declared chain only, so a criterion sharing an identifier with an unrelated document's criterion is never counted as proven.
- AC4: A document whose only link to a parent is a prose mention is reported once, naming the document, the inferred parent, and the section the link belongs in — so no existing lineage disappears without being announced.
- AC5: Tests cover a prose citation of a Done chain leaving findings deferred, an AC id shared across two unrelated chains staying unproven on both sides, and the announcement in AC4 firing exactly once per document.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/audit.py`
- `logics_manager/doc_parsing.py`
- `tests/python/test_audit_cli.py`

# Backlog
- `item_698_stop_reading_a_mentioned_reference_as_a_lineage_link`
