## task_338_deliver_the_content_keyed_onboarding_guard - Deliver the content-keyed onboarding guard
> From version: 2.21.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Add the nonce-independent signature beside the builder first, then switch the guard to it; everything else depends on the signature being stable across builds.
- Keywords: onboarding, content-signature, orchestration, vscode
- Use when: Coordinating delivery of the content-keyed onboarding guard.
- Skip when: Working on unrelated viewer or extension surfaces.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Add the signature beside the builder first, with the nonce-independence test, since everything else depends on it being stable.
- [ ] 2. Switch the guard to the new key and prove the version bump no longer reopens.
- [ ] 3. Confirm the on-demand paths and per-workspace isolation are untouched.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC2 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC3 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC4 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC5 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC6 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.
- request-AC7 -> `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_341_stop_reopening_getting_started_when_its_content_has_not_changed`
- Product brief(s): `prod_077_a_plugin_that_interrupts_only_when_it_has_something_new_to_say`
- Architecture decision(s): (none yet)
