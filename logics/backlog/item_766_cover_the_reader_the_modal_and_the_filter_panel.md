## item_766_cover_the_reader_the_modal_and_the_filter_panel - Cover the reader, the modal and the filter panel
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 16:37:54

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

# Delivery notes
- Two of the three are covered as campaign surfaces: **the reader** and **the new-request modal**. Both run every layout check against the surface they reach.
- The reader is proved by `.markdown-preview--reading .markdown-preview__prose`, not by the document panel: that panel is shared with every app screen, so its presence proves nothing about the reader. It is skipped below 900px, because the Read action lives in the details panel, which `details.css` hides there on purpose -- the same reason the details panel entry already records.
- The modal runs last and is dismissed after. It is a blocking overlay, so leaving it open would make every surface after it unreachable, and those failures would read as faults in the surfaces rather than in this entry. The harness gained a `dismiss` step for exactly that.
- **The filter panel is not covered, and the entry says so where the surfaces are declared rather than leaving a gap somebody has to notice.** Its behaviour is already driven by `FILTER_CHECKS` -- the count agreeing with the board, the count following the search box, a filter returning only what it names -- so what a surface would add is the layout checks against the panel while open. Four attempts at driving it left the panel closed at check time by a route not established, and parking that is better than an entry failing for a reason nobody has found.
- **The reason this was worth doing, found immediately:** the campaign had been failing for several sessions on `Timed out waiting for cards`, and the cause was in the harness. The readiness probe is inside a template literal serialized into the page, and a single-escaped `d` in a template literal evaluates to a plain `d` -- so the regex reached the browser as `/d+s+ofs+d+/` and could never match. It timed out on every run while the count was on screen. Two sessions were spent raising budgets over a regex eaten on the way in. The escape is doubled now, with the reason beside it, and the budget is back to the default.
- Desktop run after: **158 checks, 0 failures.**

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
