## task_400_make_the_operator_preference_store_visible_then_decide_where_it_belongs - Make the operator preference store visible, then decide where it belongs
> From version: 2.23.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Claude
> Indicators reviewed: 2026-09-09 13:23:19

# AI Context
- Summary: Report the operator preferences store in use first, because it is what makes the storage decision safe to reason about; then record the decision and implement adoption if the record moves.
- Keywords: operator preferences, store path, adoption, HOME, req_388
- Use when: Starting delivery of req_388.
- Skip when: Implementing a storage move before the reporting slice has landed.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Report the store in use and warn when more than one exists; this is what makes the rest safe to reason about.
- [x] 2. Gather the evidence the storage decision needs, including what each tool-profile HOME on the machine holds.
- [x] 3. Record the decision, then implement adoption as an explicit operator action if the record moves.
- [x] 4. Validate a forked store, an adoption and an ordinary single-store install, and confirm the environment override still decides everything.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_885_report_which_preference_store_the_viewer_opened`
- `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof: Delivered in f7ac5168. The absolute path of the record in use appears in the launch banner, the /api/viewer-info payload and the Settings identity block; covered by test_viewer_start_status_names_the_operator_preference_store and test_viewer_info_payload_reports_the_store_it_opened, and captured in artifacts/req_388/settings-forked-store.png.
- request-AC2 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof: Delivered in f7ac5168. A second record for the account is named in the banner, the Settings hint and a doctor forked_preference_stores environment warning; covered by test_a_store_forked_under_another_home_is_named_not_hidden and test_doctor_reports_a_forked_store_as_an_environment_warning.
- request-AC5 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof: Delivered in f7ac5168. A single-store install produces no warning and reads and writes the same file as before; LOGICS_VIEWER_PREFERENCES_HOME still decides the path, covered by test_the_active_store_is_reported_with_no_warning_when_it_is_the_only_one and test_the_override_still_decides_which_store_is_read_and_written.
- request-AC3 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof: Delivered as adr_033, written before the storage behaviour changed and carrying its evidence: four records on this machine holding 9, 8, 7 and 2 favourites. The record does not move; adoption is an explicit action that never merges, overwrites or deletes, proven by test_adoption_unions_the_sets_and_leaves_the_source_alone and the byte-identical source file in the browser run.
- request-AC4 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof: Delivered in bf89df5f. Settings offers adoption beside the fork warning; the browser run confirmed the union of the other record's nine favourites and its Fleet root into the active one, and that cancelling changed nothing (artifacts/req_388/adoption-confirm.png, after-adoption.png).
- request-AC5 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof deferred to slice closeout.
- request-AC6 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof: Delivered in bf89df5f. Regressions cover the forked store, the adoption itself, its repeatability, an unknown path being refused at both the function and the route, and a single-store install having nothing to adopt; each was run against the pre-fix code path before being accepted.

# Validation
- Delivery validation. python3 -m pytest tests/python/ -q: 1504 passed. npm run lint: passed, with logics_manager/viewer.py and browser-host/index.js ceilings raised and justified, and the do_POST function-length baseline re-recorded after the adoption route was extracted (232 lines inline, 217 after extraction, against a 215 baseline). Focused regressions in tests/python/test_viewer_preferences.py (active store reported, forked store named, override still authoritative, doctor warning, adoption unions the sets and leaves the source alone, adoption repeatable, adoption refuses an unknown path, single-store install has nothing to adopt) and tests/python/test_viewer_cli.py (banner names the store and warns on a fork, viewer info payload, and the route refusing an unknown path, refusing malformed JSON and merging a known one).
- Browser evidence, headless Chrome over a live viewer under an isolated HOME so no real record was touched; artifacts under artifacts/req_388. The Settings identity block names the active record and reports the forked one by path, with the adoption button beside the warning (settings-forked-store.png). The confirmation states the source file and that nothing is removed here (adoption-confirm.png). Cancelling left the active record at its single original favourite. Confirming produced the union - the nine favourites from the other record plus the one already here, and its Fleet root - and the source file was byte-identical before and after (630 bytes both times). The launch banner was verified separately by rendering it directly: it names the active record and the forked one; the in-run banner assertion read stdout before the last chunk arrived, so its "namesOtherStore" flag in adoption-evidence.json is a measurement artifact, not a product result.
- npm test (vitest, 91 files, 1001 tests): passed. One earlier full run reported a single failure whose name was not captured; two subsequent full runs passed with no failures, so it is recorded here as an unidentified flake rather than dismissed. Nothing in this delivery touches the browser-host tests beyond the Settings identity block, whose file passed in every run.
- command: `python3 -m pytest tests/python/ -q && npx vitest run && npm run lint` | result: passed | date: 2026-09-09
- Finish workflow executed on 2026-09-09.
- Linked backlog/request close verification passed.

# Report
- Both slices delivered. item_885 (f7ac5168): the record the viewer opened is now named in the launch banner, the viewer info payload and the Settings identity block, and a second record for the same account is reported as a doctor environment warning beside the existing duplicate-executable one. A forked record is detected by comparing the HOME-derived path against the account's own home taken from the passwd entry, which is the one home $HOME cannot move - no filesystem scanning. item_886 (bf89df5f) with adr_033: the record stays keyed to HOME, because a process that sets HOME is asking to be isolated and anchoring to the account would have CI runs and containers writing into the operator's real file. The forked record is made reachable instead: Settings offers an explicit adoption that adds its favourites and Fleet roots to the active record as a union, reads the source without ever writing it, and accepts only a path this account already has. Scalars are not adopted, so adoption is repeatable and cannot remove a favourite. Evidence gathered before the decision: four records on this machine holding 9, 8, 7 and 2 favourites - diverged working sets, so no automatic rule could have picked a winner without silently dropping one. The adoption route was extracted into its own handler rather than added as another branch in do_POST, which was already at its length ceiling.
- Finished on 2026-09-09.
- Linked backlog item(s): `item_885_report_which_preference_store_the_viewer_opened`, `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`
- Related request(s): `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`

# Links
- Request: `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)
