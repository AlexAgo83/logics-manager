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
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)
