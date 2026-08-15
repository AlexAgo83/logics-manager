## item_839_stop_paying_for_a_cache_that_can_never_hit - Stop paying for a cache that can never hit
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: A lifetime that matches its poll
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:29:35

# AI Context
- Summary: cdx-status costs 2.3s and its cache lives 2s under a 15s poll, so every tick misses. Lifetimes decided against the poll that consumes them.
- Keywords: cdx-status, ttl, poll interval, cache that never hits
- Use when: Setting or adding a status component's cached lifetime.
- Skip when: Making `cdx status --json` itself faster -- that is CDX's cost.

# Problem
- the CDX status component costs 2.3s and its cache lives 2s, under a poll that runs every 15s. Every tick misses, measured four times in a row with no hit, so the cache is pure overhead and the poll pays full price.
- the git status component shares the same 2s lifetime. At 0.11s the waste is smaller, but the rule it breaks is the same one.

# Scope
- In:
  - Decide each component's lifetime against the poll that consumes it, rather than by whether it is local or remote.
  - State the rule where the lifetimes are set, so the next component added does not inherit the defect.
  - Keep a forced refresh -- opening the screen itself -- exactly as responsive as it is today.
- Out:
  - Making `cdx status --json` faster: that is CDX's cost, not the viewer's.
  - Removing the CDX badge.
  - Changing the auto-refresh interval.

# Acceptance criteria
- AC1: No component's cached lifetime is shorter than the interval that polls it.
- AC2: A tick that changes nothing does not re-run `cdx status --json`.
- AC3: Opening the CDX screen still shows current state, not a stale badge value.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: No component's cached lifetime is shorter than the interval that polls it.
- request-AC4 -> This backlog slice. Proof: AC2: A tick that changes nothing does not re-run `cdx status --json`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Primary task(s): `task_384_orchestrate_the_auto_refresh_cost_work`

# Priority
- Priority: High
- Rationale: Three quarters of the per-tick cost
