## item_780_write_down_how_a_documentation_capture_is_produced - Write down how a documentation capture is produced
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Documentation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:28

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: write, down, documentation, capture, produced
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- No script writes to `docs/media/`, so the captures are made by hand with nothing recording the screen, viewport, corpus or state they were framed at. That is why they went stale silently, and why the next person recapturing them cannot match the framing.

# Scope
- In:
  - Record how each capture is produced, in enough detail to reproduce its framing.
  - Reuse `logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md` and the campaign's existing viewer-driving rather than inventing a third way.
  - Decide, and record, whether generating them is worth automating.
- Out:
  - Adding a CI job, unless the decision above concludes it is the cheaper answer.

# Delivery notes
- The record is **executable**, not prose: `scripts/dev/capture-readme-media.mjs`. A written procedure drifts from the product exactly as the images did -- that is the failure this slice exists to stop, and a paragraph describing a framing is a second thing to keep in sync.
- **It reuses the viewer-driving that already existed rather than inventing a third way.** `viewer-tour.mjs` had grown six helpers -- start a viewer on a free port, find a Chrome, launch it without touching the Keychain, speak CDP, evaluate, wait -- and they moved to `scripts/dev/viewer-driver.mjs`, which both scripts now import. One copy, so the keychain-safe launch flags cannot drift apart.
- The framing is stated once and applies to all four: **1440x900 at deviceScaleFactor 2**. That is the desktop the campaign already judges layouts at, and the doubled scale keeps text legible when GitHub displays the image at half size.
- **Every shutter waits on a selector the screen itself produces, never on a delay.** A delay is a guess that becomes wrong on a slower machine and captures a screen mid-load.
- **Decision on automation: a script yes, a CI job no.** It needs a real corpus and a running viewer, and images regenerated on every push would churn the repository with pixel differences nobody asked for. Recorded in `docs/media/PROVENANCE.md`, which the script writes.
- **A defect found by using it, in code this slice had just moved:** `waitFor` did not `await` its predicate. An async predicate returns a Promise, which is always truthy, so the loop exited on the first turn and every caller believed its condition had been met instantly. It produced four README captures of an empty board before anyone looked. Fixed in the shared driver, which means the viewer tour was silently affected by the same bug.
- **A second one, found by looking at the result:** the Activity/Project toggle is a persisted preference, so the first correct run still captured the activity feed under a caption reading "board view". The script now asserts the toggle's state rather than clicking it blind -- clicking a toggle already in the wanted state moves away from it.

# Acceptance criteria
- AC4: The production of each capture is recorded and reproducible.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: The production of each capture is recorded and reproducible.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_091_a_readme_that_shows_the_product_a_reader_will_get`
- Architecture decision(s): (none yet)
- Request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Primary task(s): `task_352_refresh_the_published_captures_once_the_screens_are_final`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_352_refresh_the_published_captures_once_the_screens_are_final` was finished via `logics-manager flow finish task` on 2026-08-14.
