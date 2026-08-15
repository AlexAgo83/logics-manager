## item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item - Index the backlog-to-task links instead of re-scanning for each item
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Cost that grows with the corpus
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: index, backlog, task, links, instead, scanning, each, item
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `_linked_tasks_for_item` answers 'which tasks implement this backlog item' by scanning every task document and asking each one which backlog items it declares. Called once per backlog item, that is the product of the two counts.
- On this corpus it costs 0.21s of a 1.39s audit, which is why it has gone unnoticed. It is the one term whose cost is quadratic, so it overtakes everything else as a corpus grows, and it is the reason a large corpus feels disproportionately worse rather than proportionally slower.

# Scope
- In:
  - Build the reverse map from task to declared backlog refs once per audit, and look items up in it.
  - Keep the existing rule that both directions count -- an item may list its tasks, or a task may declare the item it implements.
  - Confirm the audit payload is unchanged for the same corpus.
- Out:
  - Any change to what counts as a declared link.
  - The same treatment for other link lookups unless they are shown to have the same shape.

# Acceptance criteria
- AC1: Resolving a backlog item's tasks does not iterate over all documents; the reverse map is built once per audit run.
- AC2: Audit time measured on two corpus sizes grows in step with the document count rather than with its square.
- AC3: The audit payload for this repository's corpus is byte-identical to the current implementation's.

# Report
- `_linked_tasks_for_item` reads the second link direction from a reverse map built once per corpus mapping, instead of scanning every task for every item.
- The map is carried on the mapping itself (`DocIndex`, a dict that can hold an attribute) rather than threaded through the three call sites, so nothing outside `audit.py` has to know the index exists. `_apply_scope` returns one too, so a scoped run indexes its own scope instead of inheriting a map built over documents it excluded.
- Measured over synthetic corpora, resolving every item's tasks: at 900 docs / 300 items the sweep took 0.015s and the index 0.001s; at 3600 docs / 1200 items the sweep took 0.202s and the index 0.006s. Quadrupling the corpus multiplied the sweep by 13.5 and the index by 6 -- the shape of the growth changed, which is the point; the 34x at the larger size is the side effect.
- On this repository's corpus the whole audit went 1.07s -> 0.97s, and the payload is byte-identical before and after.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Resolving a backlog item's tasks does not iterate over all documents; the reverse map is built once per audit run.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Primary task(s): `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health`

# Priority
- Priority: High - the only cost that grows faster than the corpus
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health` was finished via `logics-manager flow finish task` on 2026-08-15.
