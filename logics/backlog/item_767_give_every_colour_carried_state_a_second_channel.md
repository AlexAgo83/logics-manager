## item_767_give_every_colour_carried_state_a_second_channel - Give every colour-carried state a second channel
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Card accents, row accents, project state, CI results, gate results, findings and corpus signals were all moved onto colour, every one using the green-against-red pairing colour vision deficiency most commonly affects.
- Keywords: colour only state, green red pairing, second channel, shape glyph position, density preservation
- Use when: Deciding or applying how a state is carried besides colour.
- Skip when: Colour choices themselves, and screens the nine chains do not touch.

# Problem
- Five chains move status onto colour -- card accents, row accents, project state, CI job results, gate results, findings and corpus signals -- and every one of them uses the green-against-red pairing that colour vision deficiency most commonly affects. No acceptance criterion anywhere says what else carries the meaning.

# Scope
- In:
  - Decide, once, the second channel each state uses: shape, glyph, position, text, or a channel the layout already carries.
  - Apply it wherever the redesigns put state on colour.
  - Keep the density the redesigns were for: the answer must reuse what the layout has rather than add a marker per row.
- Out:
  - Colour choices themselves, and the existing screens the nine chains do not touch.

# Acceptance criteria
- AC1: Every colour-carried state is legible without colour.
- AC2: The result is no less dense than the mockup it came from.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every colour-carried state is legible without colour.
- request-AC2 -> This backlog slice. Proof: AC2: The result is no less dense than the mockup it came from.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse`
- Architecture decision(s): (none yet)
- Request: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
- Primary task(s): `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
