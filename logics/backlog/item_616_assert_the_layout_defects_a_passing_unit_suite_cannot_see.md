## item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see - Assert the layout defects a passing unit suite cannot see
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Layout defect classes
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The campaign asserts that a few regions are not empty and that one navigation path works. Nothing looks at whether controls are drawn over each other, whether anything is clipped or forces the page sideways at the narrow viewport, whether an empty surface explains itself, or whether an action the interface offers can be reached.
- A sibling project's campaign reported zero findings while a form drew four rows on top of each other, because no assertion looked at overlap. Assertions that are not written are the campaign's real blind spot, not the ones that fail.
- Its other lesson is that a guard claiming to cover every screen must read its list from the interface: a hand-written enumeration is how a whole workspace escaped a guard for an entire request.

# Scope
- In:
  - Assert that interactive controls in a shared region do not overlap each other, at each swept viewport.
  - Assert that nothing is clipped or pushed outside the viewport, and that the page does not scroll sideways.
  - Assert that a surface rendered empty carries an explanation rather than nothing.
  - Assert that every action the interface presents is reachable and states why when it is unavailable.
  - Derive the lists these checks walk from the interface itself, so a surface or control added later is covered without editing the check.
  - Report each new assertion through the same named-check reporting as the rest.
- Out:
  - Judging whether a screen reads well or looks right, which stays attended.
  - Golden-image comparison.
  - Changing the interface to make an assertion easier to write.
  - Asserting anything about the extension host boundary, covered by the existing headless-DOM tests.

# Acceptance criteria
- AC1: Overlapping interactive controls are detected and reported, at each swept viewport.
- AC2: Clipped controls and sideways page scroll are detected and reported.
- AC3: An empty surface with no explanation is reported.
- AC4: An action presented but unreachable, or unavailable without stating why, is reported.
- AC5: Each of these checks walks a list read from the interface, shown by a test that adds a surface and sees it covered without editing the check.
- AC6: A test introduces each defect class and asserts the matching check reports it.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Overlapping interactive controls are detected and reported, at each swept viewport.
- request-AC5 -> This backlog slice. Proof: AC2: Clipped controls and sideways page scroll are detected and reported.
- request-AC9 -> This backlog slice. Proof: AC3: An empty surface with no explanation is reported.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_057_a_viewer_campaign_that_reports_what_it_saw`
- Architecture decision(s): (none yet)
- Request: `req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured`
- Primary task(s): `task_306_orchestrate_the_viewer_ui_campaign`

# AI Context
- Summary: Assert the layout defects a passing unit suite cannot see
- Keywords: scaffolded-backlog, assert the layout defects a passing unit suite cannot see, implementation-ready
- Use when: Implementing the scaffolded slice for Assert the layout defects a passing unit suite cannot see.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the campaign's reason to exist beyond the unit suite
- Rationale: Set by scaffold input or defaulted for grooming.
