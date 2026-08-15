## item_840_warm_the_badge_components_off_the_request_path - Warm the badge components off the request path
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Paying before being asked
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:21:52

# AI Context
- Summary: The first /api/status after a start costs 9.07s on the request path; req_366's warm-up already exists and does not cover the badges.
- Keywords: warm-up, cold start, api status, req_366 mechanism
- Use when: Anything expensive is first discovered by a request rather than by a background pass.
- Skip when: You would build a second warm-up mechanism.

# Problem
- The first the status route after a viewer start costs 9.07s, paid by whichever poll arrives first, which is the one that runs seconds after the page opens.
- req_366 built the warm-up for the corpus reports and it works; the badge components were not included, so the same defect survives on a different route.

# Scope
- In:
  - Warm the components the status route aggregates, using the mechanism req_366 already built.
  - A request arriving mid-warm-up waits for the answer being computed rather than starting a second one, as that mechanism already guarantees.
  - Do not delay startup or the first page load.
- Out:
  - Warming components no badge reads.
  - A second warm-up mechanism.

# Acceptance criteria
- AC1: The first the status route after a start does not pay the full cold cost.
- AC2: Startup and the first page load are not delayed.
- AC3: One warm-up, not two: the badge components use the same path the corpus reports use.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The first the status route after a start does not pay the full cold cost.
- request-AC4 -> This backlog slice. Proof: AC2: Startup and the first page load are not delayed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Primary task(s): `task_384_orchestrate_the_auto_refresh_cost_work`

# Priority
- Priority: Medium - nine seconds, once, exactly where the operator is watching
- Rationale: Set by scaffold input or defaulted for grooming.
