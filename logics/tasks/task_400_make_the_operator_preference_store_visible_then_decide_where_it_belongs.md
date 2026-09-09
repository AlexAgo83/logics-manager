## task_400_make_the_operator_preference_store_visible_then_decide_where_it_belongs - Make the operator preference store visible, then decide where it belongs
> From version: 2.23.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: Claude
> Indicators reviewed: 2026-09-09 13:02:27

# AI Context
- Summary: Report the operator preferences store in use first, because it is what makes the storage decision safe to reason about; then record the decision and implement adoption if the record moves.
- Keywords: operator preferences, store path, adoption, HOME, req_388
- Use when: Starting delivery of req_388.
- Skip when: Implementing a storage move before the reporting slice has landed.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Report the store in use and warn when more than one exists; this is what makes the rest safe to reason about.
- [ ] 2. Gather the evidence the storage decision needs, including what each tool-profile HOME on the machine holds.
- [ ] 3. Record the decision, then implement adoption as an explicit operator action if the record moves.
- [ ] 4. Validate a forked store, an adoption and an ordinary single-store install, and confirm the environment override still decides everything.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_885_report_which_preference_store_the_viewer_opened`
- `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof deferred to slice closeout.
- request-AC2 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof deferred to slice closeout.
- request-AC5 -> `item_885_report_which_preference_store_the_viewer_opened`. Proof deferred to slice closeout.
- request-AC3 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof deferred to slice closeout.
- request-AC4 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof deferred to slice closeout.
- request-AC5 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof deferred to slice closeout.
- request-AC6 -> `item_886_decide_where_the_operator_record_belongs_and_adopt_an_existing_one_deliberately`. Proof deferred to slice closeout.

# Validation
- Delivery validation. python3 -m pytest tests/python/ -q: 1504 passed. npm run lint: passed, with logics_manager/viewer.py and browser-host/index.js ceilings raised and justified, and the do_POST function-length baseline re-recorded after the adoption route was extracted (232 lines inline, 217 after extraction, against a 215 baseline). Focused regressions in tests/python/test_viewer_preferences.py (active store reported, forked store named, override still authoritative, doctor warning, adoption unions the sets and leaves the source alone, adoption repeatable, adoption refuses an unknown path, single-store install has nothing to adopt) and tests/python/test_viewer_cli.py (banner names the store and warns on a fork, viewer info payload, and the route refusing an unknown path, refusing malformed JSON and merging a known one).
- Browser evidence, headless Chrome over a live viewer under an isolated HOME so no real record was touched; artifacts under artifacts/req_388. The Settings identity block names the active record and reports the forked one by path, with the adoption button beside the warning (settings-forked-store.png). The confirmation states the source file and that nothing is removed here (adoption-confirm.png). Cancelling left the active record at its single original favourite. Confirming produced the union - the nine favourites from the other record plus the one already here, and its Fleet root - and the source file was byte-identical before and after (630 bytes both times). The launch banner was verified separately by rendering it directly: it names the active record and the forked one; the in-run banner assertion read stdout before the last chunk arrived, so its "namesOtherStore" flag in adoption-evidence.json is a measurement artifact, not a product result.

# Report
- Both slices delivered. item_885 (f7ac5168): the record the viewer opened is now named in the launch banner, the viewer info payload and the Settings identity block, and a second record for the same account is reported as a doctor environment warning beside the existing duplicate-executable one. A forked record is detected by comparing the HOME-derived path against the account's own home taken from the passwd entry, which is the one home $HOME cannot move - no filesystem scanning. item_886 (bf89df5f) with adr_033: the record stays keyed to HOME, because a process that sets HOME is asking to be isolated and anchoring to the account would have CI runs and containers writing into the operator's real file. The forked record is made reachable instead: Settings offers an explicit adoption that adds its favourites and Fleet roots to the active record as a union, reads the source without ever writing it, and accepts only a path this account already has. Scalars are not adopted, so adoption is repeatable and cannot remove a favourite. Evidence gathered before the decision: four records on this machine holding 9, 8, 7 and 2 favourites - diverged working sets, so no automatic rule could have picked a winner without silently dropping one. The adoption route was extracted into its own handler rather than added as another branch in do_POST, which was already at its length ceiling.

# Links
- Request: `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)
