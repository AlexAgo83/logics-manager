## item_749_lead_validation_health_with_the_verdict_it_owns - Lead validation health with the verdict it owns
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 09:27:43

# AI Context
- Summary: Five tiles, three of them zero, and `RELEASE READY: No` last with no reason -- restating in a different vocabulary an answer the release gate already gives on another screen.
- Keywords: validation health, release ready, verdict first, zero tiles, release gate ownership
- Use when: Changing what Validation health states at the top, or how it reports release readiness.
- Skip when: The release gate's own screen and vocabulary.

# Problem
- Five tiles, three of them zero, and `RELEASE READY: No` last with no reason on a screen where everything else is green -- restating in a different vocabulary an answer the release gate already gives on another screen.

# Scope
- In:
  - State whether anything blocks, as a sentence, where the tiles are today.
  - Point at the release gate for release readiness instead of restating it.
  - Keep the figures without letting the zeros set the scale.
- Out:
  - The release gate's own screen and vocabulary, covered by the Remote request.

# Delivery notes
- The verdict is this screen's own answer -- whether anything blocks, and how much. Measured on the live corpus: `Nothing blocks. 79 warnings and 1 workflow signal to look at.`
- **Release readiness is deferred, not restated.** The `Release ready` tile is gone and a line names the screen that owns the gate. Restating another screen's answer in a second vocabulary is worse than not answering: it invites two screens to disagree, and this one had no reason to give.
- The four remaining tiles keep their figures, zeros included, in a strip under the verdict rather than as five equal blocks where three read `0`.

# Acceptance criteria
# Acceptance criteria
- AC6: The screen leads with its own verdict and defers release readiness to the screen that owns it.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: The screen leads with its own verdict and defers release readiness to the screen that owns it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
