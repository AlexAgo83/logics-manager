## item_633_say_what_is_unavailable_before_it_is_chosen - Say what is unavailable before it is chosen
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Honest availability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:54:25

# Problem
- PARTLY WITHDRAWN. The user-facing half of this slice was inferred from a probe that clicked hidden controls, and does not hold. The status-code half is real and was delivered.
- What was claimed: choosing Translations or Theme leaves the document on the Workshop explorer, so a working button reads as a broken one. Measured since: both entries are `hidden` on a project with no such convention -- `updateProjectToolControls` hides them, and a capability check confirms `available: false` for both. A real operator never sees them. The attended tour dispatched a click on a hidden element, which a browser accepts and a person cannot do.
- What holds: the server answered HTTP 400 for a project that simply has no i18n or theme convention. A 400 says the request was malformed; the request was fine. Whoever asks -- a probe, a script, a future surface that does show the entries -- an ordinary project should not be reported as a client error, and should not put a red entry in a console.
- The rule this repeats is already written down for filter options: an action that can return nothing says so before it is chosen, with the reason. That rule is satisfied here by hiding, which is the stronger form.

# Scope
- In:
  - Answer a project with no convention as a normal result rather than a client error, and keep the console clean on it.
  - Record what was claimed about the menu entries and what refutes it, so it is not rediscovered by inference.
- Out:
  - Changing how the entries are shown or hidden, which already behaves correctly.
  - Building the translations or theme screens.
  - Changing any other status code.

# Acceptance criteria
- AC1: A project with no convention is answered as a normal result, with a state saying so.
- AC2: The route returns 200 rather than 400 for that project, and the console records no error.
- AC3: A project that does have a convention still returns its payload.
- AC4: The withdrawal states what was claimed, what was measured, and what refutes it.

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
