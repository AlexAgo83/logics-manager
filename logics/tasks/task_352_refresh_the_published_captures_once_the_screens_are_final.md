## task_352_refresh_the_published_captures_once_the_screens_are_final - Refresh the published captures once the screens are final
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:36:44

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: refresh, published, captures, once, screens, final
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Wait for the screen redesigns to land. Starting early produces a second set of images to redo, which is the waste this request exists to avoid.
- [ ] 2. Write down how a capture is produced first, so the retake follows a recorded framing instead of setting one nobody wrote down again.
- [ ] 3. Then retake against a real corpus, and correct the prose in the same pass -- the text is wrong independently of the images, and fixing one without the other leaves the section half true.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_778_retake_the_readme_captures_against_the_delivered_screens`
- `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`
- `item_780_write_down_how_a_documentation_capture_is_produced`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof deferred to slice closeout.
- request-AC2 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof deferred to slice closeout.
- request-AC5 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof deferred to slice closeout.
- request-AC3 -> `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`. Proof deferred to slice closeout.
- request-AC4 -> `item_780_write_down_how_a_documentation_capture_is_produced`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Product brief(s): `prod_091_a_readme_that_shows_the_product_a_reader_will_get`
- Architecture decision(s): (none yet)
