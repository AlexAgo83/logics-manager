## req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse - Keep the viewer redesigns legible without colour and reachable without a mouse
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Five chains move status onto colour with no second channel stated anywhere, and keyboard navigation is scoped out of one item and owned by none -- in a product carrying 67 aria attributes whose campaign already checks heading structure.
- Keywords: colour vision deficiency, second channel, status colour, keyboard reach, focus management, campaign enforcement, cross-chain condition
- Use when: Adding or reviewing any state carried by colour, or any control introduced by the viewer redesigns.
- Skip when: A full accessibility audit, screens the nine chains do not touch, and the Workshop Terminals tab.

# Needs
- Found by reviewing the nine active viewer chains for technical gaps rather than by looking at a screen: the redesigns share two assumptions that no chain states and no chain checks.
- The first is mine to answer for. Across five chains I proposed that status be carried by colour -- a left accent, a coloured count, a green check against a red cross -- and not one acceptance criterion anywhere says what carries that meaning for a reader who cannot separate the two.
- The second is a hole I opened deliberately and never closed: one item scopes keyboard navigation out, and no other item picks it up.
- Neither is a new idea imposed on the redesigns. Both are conditions the redesigns must already satisfy, and stating them once is cheaper than discovering them nine times.

# Context
- **The product already takes this seriously, which is what makes the gap a contradiction rather than an omission.** `clients/viewer/index.html` carries 67 `aria-label` and `role` attributes. The campaign's own layout checks already assert that a screen exposes a heading structure without skipping levels, and that a disabled control explains why it is disabled. Accessibility is established practice here; the nine new chains simply do not mention it.
- **Status-as-colour is proposed in five chains and qualified in none.** The board's card accent, the list row accent, the fleet home's project state, CI job results, release gate results, validation findings and corpus signals were all moved onto colour, on the argument that a reader should see state rather than read it. That argument holds only while the reader can see the colour. Green against red is the most common form of colour vision deficiency and it is exactly the pairing every one of those proposals uses.
- **Keyboard navigation is scoped out once and owned nowhere.** the backlog slice that makes selecting a card one mechanism lists "keyboard navigation across cards" under its scope-out, correctly, because it was changing what a click does. No other item in any of the nine chains mentions it. Several of the redesigns add controls that only exist under a pointer -- a fold, a segmented control, a hover-revealed action, a selected card tied to a panel -- so the surface that needs keyboard reach is growing while nothing owns it.
- **Focus is the same story.** Selection, folds and panels are being redesigned across four chains, and no chain says where focus goes when a panel opens, where it returns when one closes, or whether a focused control is visibly focused. The campaign checks that a disabled control explains itself; it does not check that a control can be reached.
- Out of scope: a full accessibility audit of the viewer, and anything about screens the nine chains do not touch. This request covers the conditions the redesigns themselves must meet, not the product's existing debt.
- Out of scope by standing instruction: the Workshop Terminals tab.
- Known risk: this request has no screens of its own. It constrains work delivered in other chains, so it lands either as a condition each of those chains must satisfy or as checks that fail when they do not. The second is the one that survives; the first is a memo.
- Known risk: the colour redundancy must not undo the density the redesigns were for. A shape or a letter beside every count would put back the noise the near-constant metric chip was removed to escape. The redundancy has to be carried by something the layout already has.

# Acceptance criteria
- AC1: Wherever the redesigns carry state by colour, that state is also legible without colour, by shape, position, text or another channel the layout already uses.
- AC2: The redundancy does not restore the per-row noise the redesigns removed: a screen that satisfies AC1 is no less dense than the mockup it was drawn from.
- AC3: Every control the redesigns introduce can be reached and operated from the keyboard, including folds, segmented controls, selectable rows, and actions that appear on hover.
- AC4: Opening a panel moves focus into it, closing one returns focus to what opened it, and a focused control is visibly focused.
- AC5: The viewer UI campaign fails when a screen carries state by colour alone, so the condition is enforced rather than remembered.
- AC6: The campaign fails when a control the redesigns introduce cannot be reached from the keyboard.
- AC7: These conditions are recorded where the other chains will meet them, rather than only in this request.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse`
- Architecture decision(s): (none yet)

# References
- clients/viewer/index.html
- clients/viewer/viewer.css
- clients/viewer/src/browser-host/index.js
- tests/helpers/viewer-layout-checks.mjs
- tests/run_local_viewer_visual_smoke.mjs
- logics/architecture/adr_029_land_the_viewer_redesigns_on_the_shared_declaration_points.md
- logics/runbook/run_001_run_the_viewer_ui_campaign_before_a_delivery.md

# Backlog
- `item_767_give_every_colour_carried_state_a_second_channel`
- `item_768_make_the_new_controls_reachable_without_a_mouse`
- `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`
