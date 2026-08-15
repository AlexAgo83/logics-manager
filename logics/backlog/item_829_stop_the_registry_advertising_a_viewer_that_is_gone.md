## item_829_stop_the_registry_advertising_a_viewer_that_is_gone - Stop the registry advertising a viewer that is gone
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: The registry describes what is running
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: registry, advertising, viewer, gone
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- A viewer that dies on a failed rebind leaves its claim in `viewers.json`, so the file names a port with nothing behind it.
- That file is what `view` reads to reuse a running viewer and what an assistant reads to write a link, so a stale claim produces a dead link and a reuse message for a viewer that is not there.

# Scope
- In:
  - Confirm what the registry already does with a claim whose port does not answer -- it probes, and the answer decides whether this slice is a fix or a test.
  - Whichever it is, leave behind a case that fails if a dead claim starts being trusted.
- Out:
  - Changing the claim format or where the file lives.
  - Probing on a schedule.

# Acceptance criteria
- AC1: A claim naming a port that answers nothing is not treated as a running viewer.
- AC2: The behaviour is covered by a test rather than by a probe timeout nobody reads.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A claim naming a port that answers nothing is not treated as a running viewer.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_101_a_restart_that_comes_back`
- Architecture decision(s): (none yet)
- Request: `req_370_make_settings_restart_bring_the_viewer_back`
- Primary task(s): `task_381_orchestrate_the_restart_fix`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_381_orchestrate_the_restart_fix` was finished via `logics-manager flow finish task` on 2026-08-15.
