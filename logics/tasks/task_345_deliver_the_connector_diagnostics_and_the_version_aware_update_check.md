## task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check - Deliver the connector diagnostics and the version-aware update check
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Establish the child's exit status and retain its output first, then check the post's response, then invalidate the update cache on the tool's version, then the connector wording.
- Keywords: connector diagnostics, exit status, retained output, response check, cache invalidation, delivery order
- Use when: Implementing the connector diagnostics or the version-aware update check.
- Skip when: Working on the screen redesigns (task_341, task_342, task_344) or the fleet root work (task_343).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Start with the connector's exit status and retained output: it is the deepest of the three layers and the other two are cheap once a reason exists to show.
- [ ] 2. Then the unchecked response, coordinating with the sibling request on where a failure is displayed rather than inventing a second place.
- [ ] 3. Then the update cache, which is self-contained.
- [ ] 4. Then the wording on the connector screen.
- [ ] 5. Write each test beside its change and verify it fails when the defect is reintroduced, rather than assuming it would.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`
- `item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done`
- `item_743_end_the_update_banner_when_the_update_happens`
- `item_744_make_the_connector_screen_state_and_action_agree`
- `item_745_cover_a_silent_failure_and_a_stale_banner`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`. Proof deferred to slice closeout.
- request-AC2 -> `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`. Proof deferred to slice closeout.
- request-AC3 -> `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`. Proof deferred to slice closeout.
- request-AC4 -> `item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done`. Proof deferred to slice closeout.
- request-AC5 -> `item_743_end_the_update_banner_when_the_update_happens`. Proof deferred to slice closeout.
- request-AC6 -> `item_743_end_the_update_banner_when_the_update_happens`. Proof deferred to slice closeout.
- request-AC7 -> `item_744_make_the_connector_screen_state_and_action_agree`. Proof deferred to slice closeout.
- request-AC8 -> `item_745_cover_a_silent_failure_and_a_stale_banner`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
