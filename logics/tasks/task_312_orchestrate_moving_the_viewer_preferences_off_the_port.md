## task_312_orchestrate_moving_the_viewer_preferences_off_the_port - Orchestrate moving the viewer preferences off the port
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 00:05:20

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Give the viewer a preference store split between the operator and the corpus, served to both hosts.
- [x] 2. Merge favourite changes rather than overwriting the set, and let a window notice one starred elsewhere.
- [x] 3. Keep a paired device's token across a restart: WITHDRAWN after measurement, recorded on `item_640`. A LAN device's origin is stable and the server's registry is already persistent.
- [x] 4. Reduce the editor's global state to a first-paint cache and remove the write nothing reads.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port`
- `item_639_let_two_windows_agree_on_the_favourites`
- `item_640_keep_a_paired_device_paired_across_a_restart`
- `item_641_retire_the_half_bridge_and_say_what_it_did`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_639_let_two_windows_agree_on_the_favourites`. Proof: `test_two_windows_starring_at_once_keep_both_favourites` in `tests/python/test_viewer_preferences.py`.
- request-AC2 -> `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port`. Proof: `test_a_corpus_preference_stays_with_its_corpus`.
- request-AC3 -> `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port`. Proof: `test_an_operator_preference_applies_in_every_repository`.
- request-AC4 -> `item_639_let_two_windows_agree_on_the_favourites`. Proof: `test_unstarring_removes_exactly_one_entry` and `test_a_scalar_preference_is_last_writer_wins`.
- request-AC5 -> `item_640_keep_a_paired_device_paired_across_a_restart`. Withdrawn after measurement: a LAN device's origin is stable and the server's device registry is already JSON-backed. The slice records what was claimed and what refutes it.
- request-AC6 -> `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port` and `item_641_retire_the_half_bridge_and_say_what_it_did`. Proof: `test_the_viewer_serves_and_accepts_preferences`, which drives a real server on an ephemeral port, and the five bridge tests in `tests/viewerPreferenceBridge.test.ts`.
- request-AC7 -> `item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port`. Proof: the cached browser values are merged into the hydrated record rather than discarded on first run.
- request-AC8 -> every slice. Proof: nine tests in `tests/python/test_viewer_preferences.py` and five in `tests/viewerPreferenceBridge.test.ts`.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate moving the viewer preferences off the port
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository`
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)
