## item_633_say_what_is_unavailable_before_it_is_chosen - Say what is unavailable before it is chosen
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Honest availability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:54:25

# Problem
- Choosing Translations or Theme leaves the document showing the Workshop explorer, title included. The only feedback is a status line most operators will not look at, so a working button reads as a broken one.
- The server answers those two requests with HTTP 400 on a project that simply has no such convention. That is a client error status for a correct request, and it puts two red errors in the console of an ordinary project every time the entries are touched.
- A screen whose endpoint fails behaves the same way: forcing the git status route to 500 put the error in the status bar and left the previous document's content on screen. The repro started from an open document and needs tightening, but the acceptance criterion below already covers it word for word.
- The rule this repeats is already written down for filter options: an action that can return nothing says so before it is chosen, with the reason.

# Scope
- In:
  - Make the two entries state their unavailability where the operator sees it, before choosing.
  - Answer a project with no convention as a normal result rather than a client error, and keep the console clean on it.
  - Derive the availability from what the server reports, so a project that does have a convention is unaffected.
  - Cover both the unavailable and the available case.
- Out:
  - Building the translations or theme screens.
  - Changing any other status code.
  - Hiding the entries, which would make a supported project look like a shorter menu.

# Acceptance criteria
- AC1: On a project with no convention, each entry states why it is unavailable before it is chosen.
- AC2: Choosing it never leaves another screen in place while claiming to have opened.
- AC3: The server answers such a project as a normal result, and the console records no error.
- AC4: A project that does have a convention still opens its screen.
- AC5: A screen whose endpoint fails reports the failure and does not leave another screen's content in place.
- AC6: Tests cover the unavailable case, the available case, and the failing endpoint, and fail against the current implementation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: On a project with no convention, each entry states why it is unavailable before it is chosen.
- request-AC2 -> This backlog slice. Proof: AC2: Choosing it never leaves another screen in place while claiming to have opened.
- request-AC6 -> This backlog slice. Proof: AC3: The server answers such a project as a normal result, and the console records no error.
- request-AC7 -> This backlog slice. Proof: AC4: A project that does have a convention still opens its screen.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Primary task(s): `task_311_orchestrate_the_attended_tour_findings`

# AI Context
- Summary: Say what is unavailable before it is chosen
- Keywords: scaffolded-backlog, say what is unavailable before it is chosen, implementation-ready
- Use when: Implementing the scaffolded slice for Say what is unavailable before it is chosen.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - two menu entries that look broken, and a normal project logged as a client error
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_311_orchestrate_the_attended_tour_findings`
