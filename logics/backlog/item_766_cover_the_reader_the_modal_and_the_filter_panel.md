## item_766_cover_the_reader_the_modal_and_the_filter_panel - Cover the reader, the modal and the filter panel
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: None of the three is covered; the reader in particular is the destination of the details panel's primary action and had never been opened in five passes over this viewer.
- Keywords: campaign coverage, reader, new request modal, filter panel, prove which surface, three viewports
- Use when: Extending the campaign to the reader, the new-request modal or the filter panel.
- Skip when: Surfaces this request could not drive, and the Terminals tab.

# Problem
- None of the three is covered. The reader in particular is the destination of the details panel's primary action and had never been opened in five passes over this viewer.

# Scope
- In:
  - Reach all three at the three viewports, proving which surface was captured.
  - Apply the existing layout and filter checks where they apply.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - The surfaces this request could not drive, and the Terminals tab.

# Acceptance criteria
- AC14: All three are covered at the three viewports with proof of what was captured.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: All three are covered at the three viewports with proof of what was captured.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Primary task(s): `task_348_deliver_the_reader_the_modal_and_the_filter_panel`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
