## item_748_give_corpus_insights_one_visual_language - Give corpus insights one visual language
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 44%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 09:13:44

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

# Delivery notes
- **The palette is declared once.** The board had tinted every stage since long before, in six hex values inside `board.css`; Corpus insights drew every bar in one blue. Copying the six values into the insights stylesheet would have made a seventh place they must agree, which is the mistake this session has already fixed three times over. They are `--stage-color-*` tokens on `:root`, and both surfaces read them.
- The bar carries its stage as a data attribute, which is what lets the palette apply. Verified in a live viewer: seven distinct colours across eight stage bars, matching the board.
- **One card, one language.** Open, Closed and Blocked were large key/value rows sitting directly beneath the thin stage bars -- the same kind of fact drawn two ways inside one card. They are bars too.
- They are *not* stacked as one list: the two sets count different axes and do not sum to the same total, so each sits under a subhead naming its axis. Stacking them unlabelled would have invited reading eleven bars as one distribution.
- A state bar has no stage, so it keeps the neutral track fill rather than borrowing a stage colour it does not mean. `Blocked` is the exception and takes the error colour, because that is the one state the card is asking you to act on.

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
