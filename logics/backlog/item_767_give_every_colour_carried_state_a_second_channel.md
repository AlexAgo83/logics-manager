## item_767_give_every_colour_carried_state_a_second_channel - Give every colour-carried state a second channel
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 35%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:27

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

# Decision

Taken 2026-08-13, so the eight chains that draw against it inherit one answer.

## The channel is the accent's shape, not an added marker

Every proposal that puts state on colour already draws a **left accent bar** on the row or
card: fleet home projects, board cards, list rows, findings groups, release gates. That bar
is the second channel. It varies by **length and fill**, which are legible without hue:

| State | Colour | Accent | Reads as |
|---|---|---|---|
| Blocked | red | full height, solid | the loudest bar on the screen |
| In progress | blue | full height, hollow centre | present but open |
| Ready | green | short, solid, top-aligned | a mark, not a bar |
| Done | green, dimmed | hairline | almost nothing |
| No corpus / unknown | grey | full height, dashed | present but not a state |

Five states, five shapes, no hue required. Greyscale the screen and the ordering survives.

## Why not the obvious alternatives

- **A glyph per row** (check, cross, dot). This is the noise the near-constant `U 90% / C 85%`
  chip was removed to escape: a mark on every row, carrying nothing on the 91.5% of rows
  that are Done. It also costs horizontal space on the phone layouts, which is the width
  that was hardest to win back.
- **Text per row.** The status word already appears in the list mode's own column and in the
  details panel. Repeating it on a card would undo the density the card redesign was for.
- **Pattern fills.** They survive greyscale but do not survive small sizes, and a 3px accent
  is the size in question.

## What this binds

- Anywhere a chain puts state on colour, the accent carries the same shape vocabulary.
  A sixth state needs a sixth shape decided here, not invented locally.
- Counts keep colour as an emphasis only: a non-zero `issues` count is red **and** bold
  against a dimmed zero, so the weight difference carries it without the hue.
- `item_769`'s check enforces this by asserting the shape attribute exists wherever the
  status colour class does, so a screen that colours without shaping fails a run.

# Delivery notes
- The channel decided above is what shipped: the **accent bar's style and width**, not a glyph, not a word, not a pattern fill. Five states, five shapes, and the ordering survives greyscale.
- The board's card accents already carried it. What this slice added is the thing that keeps it true: `item_769`'s check compares every pair of states a component has on screen and fails when two produce the same signature with hue removed.
- The signature is deliberately wide -- border style and width, font weight, text decoration, the `::before` content, the element's own text, `data-state-shape`, and the accessible name. A component that tells its states apart by **any** of those passes. That is the point: the decision names one channel as the default, not as the only permitted answer, and the CI job list already distinguishes its five states by glyph (● ◆ ◐ ○ ◇) rather than by accent. Forcing it onto the accent to satisfy a check would have made the product worse to satisfy a rule.
- Counts keep colour as emphasis only, per the decision: a non-zero count is red **and** bold against a dimmed zero.
- **The stylesheet is asserted as a file, separately.** jsdom applies no stylesheet, so the campaign check under jsdom sees no `border-left-style` at all and would pass against a product that had gone back to hue alone -- the same gap `item_737` shipped through. `tests/viewer.state-channels.test.ts` reads `board.css` and fails when two statuses collapse onto one shape.

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

# Notes
- Task `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns` was finished via `logics-manager flow finish task` on 2026-08-14.
