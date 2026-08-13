## item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines - Confirm what the payload can and cannot tell about chains and lifelines
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Two proposals assume data that may not exist -- per-event operation and chain, and per-beat lifeline dates; settle what the payload can honestly support before either is designed in.
- Keywords: activity payload, event provenance, chain grouping, lifeline dates, indicators, feasibility check
- Use when: Before designing the activity chain thread or the document lifeline, or when deciding whether either needs backend work.
- Skip when: Any board, card or panel work that does not depend on those two answers.

# Problem
- Two proposals in this request assume data that may not exist: a chain thread needs each activity event to know which operation and which chain produced it, and a lifeline needs a date per beat rather than the current state alone. Designing either before checking would build a screen on an assumption.

# Scope
- In:
  - Establish what the activity payload records per event, and whether operation and chain are recoverable.
  - Establish whether per-beat dates are derivable from indicators and provenance, or only the current state is.
  - Record the answer where the two dependent items can act on it, including what to render when the data is partial.
- Out:
  - Adding the data if it is missing; that is a decision this item informs, not one it takes.

# Acceptance criteria
- AC9: What a lifeline can honestly show today is established, including the fallback when a beat has no date.
- AC12: Whether events carry their operation and chain is established, with the cost of adding it if they do not.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: What a lifeline can honestly show today is established, including the fallback when a beat has no date.
- request-AC12 -> This backlog slice. Proof: AC12: Whether events carry their operation and chain is established, with the cost of adding it if they do not.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
