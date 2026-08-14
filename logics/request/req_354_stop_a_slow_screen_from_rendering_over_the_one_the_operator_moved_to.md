## req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to - Stop a slow screen from rendering over the one the operator moved to
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The campaign opened the fleet home, opened Corpus insights, and reported insights while standing on Fleet -- a screen's late load re-rendered over the one the operator had moved to, and the workaround lives in the test rather than the product.
- Keywords: superseded render, invalidatePendingViews, late async load, showFleetHome, campaign workaround, singleton reuse observation
- Use when: Changing how a screen renders after an asynchronous load, or investigating a viewer relaunch that reuses a dead server.
- Skip when: Making slow screens fast, tracked as item_770.

# Needs
- Found while delivering the viewer redesigns, 2026-08-13, not by reviewing a screen. Both entries here are defects the delivery ran into and worked around rather than fixed.
- The first is reproducible and was reproduced by the campaign itself, which is the strongest evidence any of these requests has: the check reported one screen while standing on another.
- The second was observed several times during delivery and could not be reproduced on demand. It is recorded as an observation with its evidence rather than as a confirmed defect, so that whoever meets it next starts from what is known instead of from nothing.
- The workaround for the first lives in the test harness, which means the product still does it and only the campaign is protected.

# Context
- **A screen that finishes loading after the operator has moved on re-renders over the one they moved to.** Reproduced deterministically by the viewer UI campaign: it opened the fleet home, waited until the document title read `Fleet`, then opened Corpus insights -- and reported `insights: reachable -- showing 'Fleet'`. The fleet home's project-state pass had completed late and re-rendered the screen underneath insights.
- **The cause is that a screen's async work does not know it has been superseded.** `showFleetHome` calls `loadProjectState` and then re-renders; nothing checks that the screen it is rendering into is still the screen the operator is on. The same shape exists wherever a screen loads asynchronously and re-renders on completion, which is most of them -- the fleet home is simply the one slow enough and the one the campaign happened to visit first.
- **`invalidatePendingViews` exists and is called by `setDocument`,** so the intent to guard against exactly this is already in the code. Whatever the fleet home's state pass does is not covered by it. Establishing why is the first piece of work, because a guard that exists and does not hold is worth more to understand than a new one is to add.
- **The workaround is in the wrong place.** the campaign harness now settles for 400ms after a screen's title matches and re-opens the screen once if a late render took it back. That protects the campaign. It does not protect an operator, who sees the same thing if they click faster than a screen loads -- and several screens take twenty seconds or more against a large corpus.
- **Second, unconfirmed: a relaunched viewer can be told to reuse a server that is no longer there.** During delivery, launches reported `Reusing the viewer already running for <root> at http://127.0.0.1:8804?project=...` and the browser then failed with a connection-refused error, on ports whose process had been killed seconds earlier. A later attempt to reproduce it -- start, kill, relaunch on a different port -- bound cleanly, so it is timing-dependent and probably a race between the registry entry and its liveness probe rather than a stale entry that never expires.
- Out of scope: the load times themselves, tracked under `logics/request/req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print.md`. This request is about what happens while a screen is slow, not about making it fast.
- Known risk: the second entry may not be a defect at all. It should be investigated before it is designed for, and closed as not-reproducible if that is what the investigation finds -- which is a result, not a failure.

# Acceptance criteria
- AC1: A screen's asynchronous work does not render into the document panel once the operator has moved to another screen.
- AC2: Why the existing pending-view guard does not cover this path is established and recorded, so the fix extends what is there rather than adding a second mechanism beside it.
- AC3: The behaviour holds for every screen that loads asynchronously, not only the one this was found on.
- AC4: The campaign's settle-and-reopen workaround is removed once the product no longer needs it, so the harness stops compensating for a defect that has been fixed.
- AC5: Whether a relaunched viewer can be pointed at a server that is no longer listening is established, with the answer recorded either way.
- AC6: A regression covers a screen whose load completes after the operator has moved on, and fails when the guard is removed.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- tests/run_local_viewer_visual_smoke.mjs
- logics_manager/viewer.py
- logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md

# Backlog
- `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`
- `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`
- `item_776_take_the_workaround_back_out_of_the_campaign`
- `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`
