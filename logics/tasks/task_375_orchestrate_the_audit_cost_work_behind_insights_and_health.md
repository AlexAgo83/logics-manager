## task_375_orchestrate_the_audit_cost_work_behind_insights_and_health - Orchestrate the audit cost work behind Insights and Health
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 05:57:26

# AI Context
- Summary: Sequences the five audit-cost slices behind Insights and Health: measure the baseline, remove the quadratic sweep, cache on the corpus signature, bound the payload, then reuse the source scan and memoise prose extraction.
- Keywords: audit cost, orchestration, corpus insights, validation health, measured baseline
- Use when: Implementing this task.
- Skip when: Any change to what the audit checks or how the screens present it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Measure first and record the baseline, so every later claim is against a number rather than an impression.
- [x] 2. Remove the quadratic link sweep: it is small today and dominant on a large corpus, and it is the only change that alters how the cost grows.
- [x] 3. Cache the audit answer on the corpus signature, which is the gain an operator feels on the second look.
- [x] 4. Bound the payload once the computation is cheap enough that delivery is the remaining cost.
- [x] 5. Reuse the repository source scan and memoise the prose-level extraction.
- [x] 6. Re-measure over HTTP against a running viewer, and confirm the findings are unchanged for the same corpus.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`
- `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`
- `item_806_send_the_screens_the_findings_they_display_not_all_of_them`
- `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`
- `item_808_memoise_the_remaining_reference_extraction`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`. Proof: `_linked_tasks_for_item` reads a reverse map built once per corpus mapping. Measured on two corpus sizes: quadrupling the corpus multiplied the old sweep by 13.5 (0.015s to 0.202s) and the index by 6 (0.001s to 0.006s).
- request-AC2 -> This task, via `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`. Proof: `/api/audit` measured 1.17s cold then 12ms on the next request, 0.95s again immediately after touching a document, then 12ms. Insights and Health share the one cached answer.
- request-AC3 -> This task, via `item_806_send_the_screens_the_findings_they_display_not_all_of_them`. Proof: response 0.479 MB to 0.190 MB by dropping the three derived views the viewer never reads; the counts and groupings both screens display are unchanged, and nothing became unreachable since the client groups the canonical list itself.
- request-AC4 -> This task, via `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`. Proof: `_repo_blob` caches on a (file count, newest mtime) signature gathered during the walk it already performs; 0.199s to 0.095s, with the unresolved-anchor findings unchanged.
- request-AC5 -> This task, via all five slices. Proof: end to end over HTTP, waiting for each screen's real content: Corpus insights 2.71s with the audit forced cold, then 0.41s; Validation health 0.58s then 0.50s. Audit payload byte-identical to the previous implementation for the same corpus.

# Validation
- `python3 -m pytest tests/python`: 1386/1386 passed. `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts tests/viewer.reader.test.ts tests/webview.layout-collapse.test.ts`: 268/268 passed.
- End to end over HTTP against a running viewer, waiting for each screen's real content rather than its loading panel: with the audit forced cold, Corpus insights 2.71s; Validation health immediately after 0.58s; re-opening each 0.41s and 0.50s. Every look but the first after a corpus change is about half a second.
- Endpoints on the same run: `/api/audit` 1.17s cold and 12ms cached, `/api/lint` 0.34s, `/api/health` 0.12s. Audit response 0.190 MB, down from 0.479 MB.
- Audit payload verified byte-identical before and after for item_804 and for item_807+item_808 together, on this repository's corpus.
- Growth, measured on synthetic corpora rather than argued: resolving every backlog item's tasks took 0.015s at 900 docs and 0.202s at 3600 with the per-item sweep, against 0.001s and 0.006s with the index.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- All five slices are implemented and committed. The measured baseline they were scoped against -- audit 1.39s in-process, 2.2s over HTTP, 0.46 MB payload -- now reads 12ms cached, 0.19 MB, with the cold path at 0.91s.
- The order in the plan held, and mattered: the quadratic sweep first because it is the only change that alters how the cost grows, then the cache because it is the gain an operator actually feels, then the payload once computing was cheap enough that delivery was what remained.
- Two of the five turned out to be worth less than expected once the cache landed, and are recorded as such rather than inflated: with the audit at 12ms on the second look, item_807 and item_808 only shorten the first computation after a change.
- item_806 was deliberately scoped down after measuring: 96% of the payload was the same findings three times over, and dropping the duplicate views was enough. Truncating the canonical list was rejected because Insights derives its category and doc-type counts from it, so a bounded list would silently corrupt totals the screen presents as complete.
- Found while measuring, and fixed in the same wave although it belongs to req_359: clicking a screen while another was loading did nothing at all, because the busy state disabled navigation as well as refusing the action. That is what the operator had been reporting as "Runbooks takes a long time" -- it was never opened. Recorded on item_795.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`, `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`, `item_806_send_the_screens_the_findings_they_display_not_all_of_them`, `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`, `item_808_memoise_the_remaining_reference_extraction`
- Related request(s): `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`

# Links
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
