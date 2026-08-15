## item_806_send_the_screens_the_findings_they_display_not_all_of_them - Send the screens the findings they display, not all of them
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: A payload sized by the screen
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: send, screens, findings, they, display, not, all, them
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The audit response carries every finding: 449 of them and 0.46 MB on this corpus, on every call from either screen.
- Both screens render counts, groupings, and a bounded list. The difference between 1.39s in-process and about 2.2s over HTTP is request handling and serialising a payload most of which is never shown.

# Scope
- In:
  - Return the counts and groupings the screens already display, plus a bounded number of findings per group.
  - Give the rest a route of its own, so nothing becomes unreachable.
  - State when a list is bounded, rather than letting a truncated list read as a complete one.
- Out:
  - Changing which findings the audit produces.
  - Changing how the screens group or word what they show.

# Acceptance criteria
- AC1: The audit response for this repository's corpus is materially smaller than 0.46 MB while the counts and groupings both screens display are unchanged.
- AC2: Findings beyond the bound are reachable, and a bounded list says that it is bounded.
- AC3: Neither screen loses information it previously showed.

# Report
- Measured before deciding what to cut: 96% of the 0.48 MB response was the same 449 findings three times over -- `findings` (31%), `warnings` (31%, the same list filtered by severity) and `findings_by_doc` (34%, the same list regrouped).
- The viewer reads none of the derived views: `collectHealthFindings` takes `findings`, falls back to `issues` + `warnings` only for an older server, and groups them itself. So the derived keys are dropped from the HTTP response and nothing on either screen changes. 0.479 MB to 0.190 MB, a 60% cut.
- Dropped from the response, not from `audit_payload`: the CLI and the MCP surface share that function and do read those keys. The fallback path is preserved -- a payload without a canonical `findings` list is sent whole, since the client would otherwise have nothing to read.
- The findings list itself is not truncated. Insights derives its category and doc-type counts from that list, so a bounded list would silently corrupt numbers the screen presents as totals. Sending the aggregates from the server first is the prerequisite, and at 0.19 MB over loopback it is not currently worth the change.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The audit response for this repository's corpus is materially smaller than 0.46 MB while the counts and groupings both screens display are unchanged.
- request-AC5 -> This backlog slice. Proof: AC2: Findings beyond the bound are reachable, and a bounded list says that it is bounded.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Primary task(s): `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health`

# Priority
- Priority: Medium - removes the gap between computing and delivering
- Rationale: Set by scaffold input or defaulted for grooming.
