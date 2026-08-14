## item_752_give_getting_started_a_reading_measure_and_a_position - Give Getting Started a reading measure and a position
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 10:13:04

# AI Context
- Summary: The intro runs about 110 characters where comfortable reading is 45 to 75, the right third stays empty while four stages stack into a long scroll, and one stage has an action, another none, and `Open Health` appears twice.
- Keywords: reading measure, line length, stage navigation, position indicator, duplicate action, long scroll
- Use when: Changing the Getting Started layout, its navigation, or its per-stage actions.
- Skip when: What the guide says, which is not in question.

# Problem
- The intro runs about 110 characters where comfortable reading is 45 to 75; the column is pinned left with the right third empty while four stages stack into a long scroll; nothing says how many stages there are or where the reader is; and one stage has an action, another has none, and one action appears twice.

# Scope
- In:
  - Set the prose at a readable measure and put the screen's own stage navigation in the width that frees.
  - State the number of stages and the reader's position.
  - Give every stage an action, and no action twice.
- Out:
  - What the guide says, which is not in question.

# Delivery notes
- The prose takes a 68ch measure; the width that frees carries the screen's own stage navigation rather than nothing. Measured live at 1440x900: the paragraph column is 454px, roughly 60 characters, inside the 45-75 the slice asks for, and there is no sideways scroll.
- The screen states there are four stages, and each stage says which one it is -- `1 of 4` where the number used to be a bare `1`. The navigation is sticky, so the position stays available through the scroll rather than only at the top.
- **Every stage ends in an action, and no action is offered twice.** `Delivery Slices` ended in nothing while the other three ended in a button, so the guide stopped being a sequence at its second step; it opens the board, which is where the slices it describes actually appear. `Open Health` sat in the Closeout stage *and* in the footer -- an action offered twice reads as two different actions until you try both -- and it stays where the stage that needs it is.
- Below 900px the two columns become one and the navigation stops being sticky, which is where a 68ch measure and a 220px rail no longer both fit.

# Acceptance criteria
# Acceptance criteria
- AC10: Prose is at a readable measure and the freed width carries the navigation.
- AC11: Stage count, position, and one action per stage with no duplicates.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC10: Prose is at a readable measure and the freed width carries the navigation.
- request-AC11 -> This backlog slice. Proof: AC11: Stage count, position, and one action per stage with no duplicates.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
