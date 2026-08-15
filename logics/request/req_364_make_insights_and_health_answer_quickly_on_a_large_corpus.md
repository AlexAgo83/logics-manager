## req_364_make_insights_and_health_answer_quickly_on_a_large_corpus - Make Insights and Health answer quickly on a large corpus
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer responsiveness on a large corpus
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 05:00:28

# AI Context
- Summary: Corpus insights and Validation health both wait on /api/audit, measured at 1.39s in-process and 2.2s over HTTP on 1668 documents with a 0.46 MB payload. No single hot spot is left; what remains is one quadratic link sweep, an answer recomputed on every look, a payload larger than either screen shows, and a 44 MB source scan rebuilt each run.
- Keywords: audit cost, corpus insights, validation health, quadratic link sweep, audit cache, payload size, repo blob
- Use when: Changing anything that decides how long an audit takes, or before assuming a corpus screen is slow for a reason not measured here.
- Skip when: Changing what the audit checks or what the screens say -- this is only about how long they take to answer. Also skip for lint (0.16s) and workflow health (0.15s), neither of which is worth attacking.

# Needs
- As an operator on a large corpus, I need Corpus insights and Validation health to answer in about a second, so that reading the corpus is not a decision about whether it is worth waiting.
- As an operator, I need the cost of those screens to grow in step with the corpus rather than faster than it, so that a corpus twice the size does not cost four times the wait.
- As an operator, I need a screen re-opened or auto-refreshed to reuse the answer it already computed, while still reflecting a document I have just edited.

# Context
- Both screens fetch /api/lint and /api/audit; Health also fetches /api/health. Measured on this repository's 1668-document corpus with a warm filesystem cache: audit 1.39s in-process and about 2.2s over HTTP, lint 0.16s, health 0.15s. The audit JSON payload is 0.46 MB for 449 findings. Cold, the same audit takes about 5s.
- An earlier wave already removed the two dominant costs: `_declared_refs` was re-splitting a document's text on every call (305k calls, 40 of the 47 seconds an audit took), and `_repo_blob` was walking with `rglob('*')` and descending into `node_modules` before discarding it. Audit went from 47s to about 5s cold, and its payload was verified byte-identical before and after. What follows is what is left.
- No single hot spot remains. The 1.39s is spread: `_extract_refs` 0.38s over 8127 calls, `_code_anchor_issues` 0.31s (of which `_repo_blob` 0.25s), `_linked_tasks_for_item` 0.21s. The gap between 1.39s in-process and 2.2s over HTTP is request handling and serialising 0.46 MB.
- `_linked_tasks_for_item` is the one term that does not grow linearly: it scans every task document for every backlog item, so its cost is the product of the two counts. At 1668 documents it is only 0.21s, which is why it has not been noticed; at ten thousand it is the dominant cost on its own. A `ponytail:` note in `audit.py` already records this and names the fix.
- Nothing caches the audit answer. Opening Insights and then Health recomputes it; the viewer's 15-second auto-refresh recomputes it again. The viewer already has a caching mechanism for its status panels (`status_component` in `viewer.py`), but it expires on a time-to-live, which is the wrong invalidation here: an operator who edits a document expects Health to say so on the next look, not when a timer happens to lapse.
- `_repo_blob` reads every source file in the repository into a single 44 MB string on each audit, to answer whether a backticked symbol appears anywhere. Its cost tracks the size of the repository rather than the size of the corpus, so it is paid even when the corpus has barely changed.
- The screens render counts, groups, and a bounded list, but the payload carries every finding. On this corpus that is 449 findings and 0.46 MB per call, serialised and transferred each time either screen opens or refreshes.

# Acceptance criteria
- AC1: An audit of a corpus contains no per-document scan of all documents of another kind; its measured cost grows in step with the document count rather than faster, demonstrated on at least two corpus sizes.
- AC2: Re-opening Insights or Health, or letting the auto-refresh run, reuses the previously computed audit instead of recomputing it, and a document edited on disk is reflected in the next answer rather than after a delay.
- AC3: The audit response carries the counts and groupings the screens display plus a bounded number of findings, with the remainder reachable on demand; no screen loses information it previously showed.
- AC4: The repository-wide source scan behind code-anchor checking is not rebuilt on every audit.
- AC5: Insights and Health answer in about a second on this repository's corpus, measured over HTTP against a running viewer, and the audit payload is byte-identical in its findings to the current implementation for the same corpus.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- logics_manager/audit.py
- logics_manager/code_anchors.py
- logics_manager/viewer.py

# Backlog
- `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`
- `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`
- `item_806_send_the_screens_the_findings_they_display_not_all_of_them`
- `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`
- `item_808_memoise_the_remaining_reference_extraction`
