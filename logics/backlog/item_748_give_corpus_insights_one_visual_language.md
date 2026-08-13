## item_748_give_corpus_insights_one_visual_language - Give corpus insights one visual language
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The corpus shape bars are one blue for all seven stages while the board already colours each stage, and Open/Closed/Blocked render as large rows directly beneath those thin bars in the same card.
- Keywords: corpus shape bars, stage colours, card__title-prefix, open closed blocked, visual consistency
- Use when: Changing how Corpus insights draws its figures.
- Skip when: Which figures the screen reports.

# Problem
- The corpus shape bars are all one blue while the board already gives every stage its own colour, and Open, Closed and Blocked render as large rows directly beneath those thin bars inside the same card.

# Scope
- In:
  - Reuse the per-stage colours the board already applies.
  - Draw facts of the same kind the same way within a card.
- Out:
  - Which figures the screen reports.

# Acceptance criteria
- AC5: Stage colours are reused and each card uses one visual language.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: Stage colours are reused and each card uses one visual language.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.
