## item_724_tell_one_chain_s_story_in_the_activity_feed - Tell one chain's story in the activity feed
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: One scaffold produced ten peer rows that pushed everything else off screen; collapse an operation into one entry and let a workflow chain's events be read together, reachable from a card.
- Keywords: operation grouping, chain thread, scaffold events, activity from a card, event provenance
- Use when: Grouping activity events by operation or by chain, or linking a card to its chain's history.
- Skip when: Adding event kinds, and the activity retention window.

# Problem
- One scaffold wrote ten documents and produced ten peer rows that pushed everything else off the screen; it was one action, and the documents are its detail.

# Scope
- In:
  - Collapse an operation's events into one entry that names what it produced.
  - Read a workflow chain's events together as that chain's history, reachable from a card.
  - Follow what the preceding investigation established about what the payload can support.
- Out:
  - Adding event kinds, and the activity retention window.

# Acceptance criteria
- AC12: One operation is one entry, and a chain's history can be read together and reached from a card.

# AC Traceability
- request-AC12 -> This backlog slice. Proof: AC12: One operation is one entry, and a chain's history can be read together and reached from a card.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
