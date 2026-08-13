## task_350_deliver_the_released_artifact_content_check - Deliver the released-artifact content check
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
- Summary: Define dev-only first because the other two items are shaped by that answer, then build and inspect proving the check fails on a reintroduced file, then choose the hook with its measured cost stated.
- Keywords: delivery order, dev-only definition first, build and inspect, hook placement, load-bearing proof
- Use when: Implementing the released-artifact content check.
- Skip when: The demo board work, closed under task_340.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Define dev-only first: the other two items are shaped by that answer, and a check written before it would encode a list.
- [ ] 2. Then build and inspect, proving the check fails on a reintroduced dev-only file before trusting it.
- [ ] 3. Then choose the hook, with the measured cost stated beside the choice.
- [ ] 4. Do not audit the current artifacts before the definition exists -- a finding without a rule behind it is an opinion.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_771_define_dev_only_as_a_property_rather_than_a_list`
- `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`
- `item_773_put_the_check_where_a_release_cannot_skip_it`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_771_define_dev_only_as_a_property_rather_than_a_list`. Proof deferred to slice closeout.
- request-AC6 -> `item_771_define_dev_only_as_a_property_rather_than_a_list`. Proof deferred to slice closeout.
- request-AC2 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof deferred to slice closeout.
- request-AC5 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof deferred to slice closeout.
- request-AC4 -> `item_773_put_the_check_where_a_release_cannot_skip_it`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_353_prove_a_published_artifact_contains_only_the_product`
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
