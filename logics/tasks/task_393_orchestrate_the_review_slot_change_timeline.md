## task_393_orchestrate_the_review_slot_change_timeline - Orchestrate the Review slot change timeline
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 92%
> Confidence: 88%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-22 17:34:02

# AI Context
- Summary: Coordinates backend Review burst data, frontend Review slot delivery, focused tests, bundle rebuild, and Logics validation.
- Keywords: orchestrate, review, slot, change, timeline
- Use when: starting or sequencing the implementation work for `req_381`.
- Skip when: grooming unrelated viewer Git cockpit improvements outside the Review slot.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Start with the backend Review payload and committed-file diff endpoint, reusing `viewer_git.py` safety and truncation helpers.
- [ ] 2. Add focused Python coverage for review burst construction and committed-file diff edge cases.
- [ ] 3. Wire the `Review` slot into the existing viewer navigation and browser-host screen router.
- [ ] 4. Expand the Activity/Project surface switcher into Activity/Project/Review, with a phone fallback that uses the existing compact menu/sheet behavior instead of wrapping controls.
- [ ] 5. Build the burst rail, file list, diff pane, responsive layout, empty states, and arrow-key selection in the shared viewer source with the smallest CSS needed.
- [ ] 6. Add browser-host tests for render states, selection, keyboard navigation, diff fetches, and key-handler scoping against modals, text inputs, and the existing document-level shortcuts.
- [ ] 7. Add Review to the existing visual campaign or equivalent layout harness at desktop, tablet, and phone widths.
- [ ] 8. Regenerate the browser host bundle, run targeted checks, then validate the Logics docs and close out.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_857_expose_review_bursts_from_local_git`
- `item_858_build_the_review_slot_timeline_ui`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC3 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC5 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC7 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC8 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC10 -> `item_857_expose_review_bursts_from_local_git`. Proof deferred to slice closeout.
- request-AC1 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC2 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC3 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC4 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC5 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC6 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC7 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC8 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC9 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC10 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC11 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC12 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.
- request-AC13 -> `item_858_build_the_review_slot_timeline_ui`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_381_add_a_review_slot_for_project_change_timelines`
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)
