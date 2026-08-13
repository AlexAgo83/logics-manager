## item_780_write_down_how_a_documentation_capture_is_produced - Write down how a documentation capture is produced
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Documentation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:36:44

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
