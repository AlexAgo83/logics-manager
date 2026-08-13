## item_743_end_the_update_banner_when_the_update_happens - End the update banner when the update happens
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The cdx update payload is cached for 24 hours keyed on the repository root alone, so the banner keeps recommending an update the operator already performed, and Refresh re-reads the same cached answer.
- Keywords: cdx_update_info_payload, CDX_UPDATE_CHECK_INTERVAL_SECONDS, cache invalidation, installed version, stale banner
- Use when: Changing how the viewer caches or refreshes its answer about an external tool's version.
- Skip when: How the update is performed, or resolving which of several installed executables is used.

# Problem
- The update payload is cached for 24 hours keyed on the repository root alone, so after the operator runs the update the banner recommends, it keeps recommending it for up to a day -- and Refresh re-reads the same cached payload.

# Scope
- In:
  - Invalidate the cached answer when the tool it describes changes.
  - Keep the check cheap enough that the cache is still worth having.
- Out:
  - How the update itself is performed, and resolving which of several installed executables is used.

# Acceptance criteria
- AC5: The banner stops after the update it asked for, without a restart or an expiry.
- AC6: The cache is invalidated by the tool changing, not only by time.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: The banner stops after the update it asked for, without a restart or an expiry.
- request-AC6 -> This backlog slice. Proof: AC6: The cache is invalidated by the tool changing, not only by time.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Primary task(s): `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
