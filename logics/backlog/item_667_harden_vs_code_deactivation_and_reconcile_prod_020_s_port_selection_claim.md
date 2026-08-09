## item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim - Harden VS Code deactivation and reconcile prod_020's port-selection claim
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Cleanup and documentation accuracy
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `deactivate()` in extension.ts (line 95) is empty; tracked viewer servers are only stopped via a `context.subscriptions` disposable (logicsViewProvider.ts:111), which does not fire on a force-quit or extension-host crash - `item_527`'s stated AC ("Clean up the child process on extension deactivate") is not literally met.
- `prod_020` states the CLI "starts a local server on an available localhost port" and lists a "port-selection story" as in-scope, but the actual default is a fixed port with a manual --port 0 workaround and a traceback on collision (addressed in the sibling slice of this request) - the doc currently over-promises relative to the delivered behavior.

# Scope
- In:
  - Call `viewerServerManager.stopAll()` explicitly from `deactivate()`, in addition to the existing subscription disposal, as a redundant safety net.
  - Update `prod_020` to describe the actual port behavior once the sibling slices in this request land (clear collision errors, distinct viewer/MCP defaults, registry-based reuse) - or adjust wording now if any part of the original promise is simply inaccurate independent of those fixes.
- Out:
  - Any new orphan-detection mechanism beyond what registry-based reuse (previous slice) already provides.
  - Rewriting the rest of prod_020; only the port-selection and shutdown claims are in scope.

# Acceptance criteria
- AC6: `deactivate()` in the VS Code extension explicitly stops every tracked viewer server, not only via subscription disposal - matching the intent already stated in `item_527`.
- AC7: `prod_020`'s "available localhost port" and "port-selection story" language is reconciled with the actual behavior after this request - either the doc is corrected to describe the real default-plus-fallback behavior, or the behavior is changed to match what was already promised; whichever direction, the two stop contradicting each other.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: `deactivate()` in the VS Code extension explicitly stops every tracked viewer server, not only via subscription disposal - matching the intent already stated in `item_527`.
- request-AC7 -> This backlog slice. Proof: AC7: `prod_020`'s "available localhost port" and "port-selection story" language is reconciled with the actual behavior after this request - either the doc is corrected to describe the real default-plus-fallback behavior, or the behavior is changed to match what was already promised; whichever direction, the two stop contradicting each other.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)
- Request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Primary task(s): `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`

# AI Context
- Summary: Harden VS Code deactivation and reconcile prod_020's port-selection claim
- Keywords: scaffolded-backlog, harden vs code deactivation and reconcile prod_020's port-selection claim, implementation-ready
- Use when: Implementing the scaffolded slice for Harden VS Code deactivation and reconcile prod_020's port-selection claim.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - closes a stated-but-unmet AC (item_527) and a doc/behavior mismatch, neither urgent alone
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`

# Notes
- Task `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle` was finished via `logics-manager flow finish task` on 2026-08-09.
