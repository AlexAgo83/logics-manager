## item_752_give_getting_started_a_reading_measure_and_a_position - Give Getting Started a reading measure and a position
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 44%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
