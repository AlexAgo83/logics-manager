## item_757_make_the_runbooks_screen_do_what_its_tab_claims - Make the runbooks screen do what its tab claims
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
- Summary: The tab promises search, browse by category and verify; the screen offers search, a redundant Search button beside the field, 85% empty space, and an eyebrow naming three tabs on a screen with four.
- Keywords: workshop runbooks, browse by category, verification due, redundant search button, stale eyebrow, empty screen
- Use when: Changing the Runbooks tab's search, browsing, verification display or its eyebrow.
- Skip when: What a runbook contains, and the verification workflow itself.

# Problem
- The tab is titled "search, browse by category, verify" and the screen offers only search; a `Search` button sits beside the search field; 85% of the screen is empty below two runbooks; and the eyebrow names three tabs on a screen that has four.

# Scope
- In:
  - Browse by category, using the width the empty screen already has.
  - Surface which runbooks are due for verification.
  - Remove the control that duplicates the live filter, and correct the eyebrow.
- Out:
  - What a runbook contains, and the verification workflow itself.

# Acceptance criteria
- AC6: Search, browse by category and verification status are all present.
- AC7: The redundant control is gone and the eyebrow matches the tabs.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Search, browse by category and verification status are all present.
- request-AC7 -> This backlog slice. Proof: AC7: The redundant control is gone and the eyebrow matches the tabs.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Primary task(s): `task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
