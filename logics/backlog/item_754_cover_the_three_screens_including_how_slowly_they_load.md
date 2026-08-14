## item_754_cover_the_three_screens_including_how_slowly_they_load - Cover the three screens, including how slowly they load
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 33%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 08:13:36

# AI Context
- Summary: None of the three is covered, and all load slowly enough that a capture seven seconds after the click returned the previous screen with a loading message -- so a check that does not wait asserts on whatever is there.
- Keywords: campaign coverage, slow loading screens, wait for screen, prove which screen, three viewports
- Use when: Extending the campaign to Corpus insights, Validation health or Getting Started, or to any slow-loading screen.
- Skip when: New check kinds beyond what the layout checks already provide.

# Problem
- None of these three is covered. They also load slowly enough that a capture taken seven seconds after the click returned the previous screen with a loading message -- so a check that does not wait for the screen it means to assert on will assert on whatever is there.

# Scope
- In:
  - Reach all three, wait for each to finish loading, and prove which screen was captured before asserting.
  - Apply the existing layout checks at the three viewports.
  - Do this before the redraws, so the checks observe the change.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Delivery notes
- All three screens were already visited by the campaign, added by `item_715`, but skipped by the slow-check flag on every run -- so they were covered in name and never exercised. They run now at all three viewports: 322 checks, no findings.
- **The wait was on the title, and the title is not the screen.** `item_770` gives these screens a placeholder that carries the final title while the scans run, so a check stopping at the title would assert on the placeholder. The campaign waits for `[data-viewer-screen-loading]` to be gone as well, which is the same rule `run_002` records: prove which screen you captured, and prove it has finished.
- Delivered before the redraws, as the slice asks, so the checks will observe them.

# Acceptance criteria
- AC13: All three hold at the three viewports.
- AC14: The campaign waits for the screen and proves which one it captured.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC13 -> This backlog slice. Proof: AC13: All three hold at the three viewports.
- request-AC14 -> This backlog slice. Proof: AC14: The campaign waits for the screen and proves which one it captured.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
