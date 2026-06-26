## item_505_clean_up_duplicated_and_dead_client_js_ts_code - Clean up duplicated and dead client JS/TS code
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Progress: 100%
> Complexity: Low
> Theme: Client cleanup
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- cdxRunStatusDetail is dead, escapeHtml/asString/parseTimestamp are redefined in logicsHybridInsightsHtml, UNAVAILABLE_* constants are duplicated, unused void/declare statements linger, several fetches call .json() without checking response.ok, and the insights sort comparator can return NaN.

# Scope
- In:
  - Remove the dead cdxRunStatusDetail export and unused void/declare statements
  - Deduplicate escapeHtml/asString/parseTimestamp and the UNAVAILABLE_* constants into a shared location
  - Check response.ok before calling .json() in the affected fetches
  - Make the insights sort comparator return 0 for equal timestamps instead of NaN
- Out:
  - The media-mirror duplication (tracked separately as a build-pipeline concern)
  - Refactoring the state-wrapper getters and factory closures

# Acceptance criteria
- AC1: Dead code and duplicated helpers/constants are removed or shared.
- AC2: The affected fetches check response.ok and the sort comparator never returns NaN.
- AC3: The vitest suite and TypeScript build pass unchanged.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: Dead code and duplicated helpers/constants are removed or shared.
- request-AC12 -> This backlog slice. Proof: AC2: The affected fetches check response.ok and the sort comparator never returns NaN.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Notes
- The audit flagged `cdxRunStatusDetail` as dead, but it is exported from `clients/viewer/src/browser-host/util.js` and imported/used in `index.js` (the cdx runs view). The finding was stale; the function was left in place. The actually-dead `void webview;` statements were removed instead.

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Clean up duplicated and dead client JS/TS code
- Keywords: scaffolded-backlog, clean up duplicated and dead client js/ts code, implementation-ready
- Use when: Implementing the scaffolded slice for Clean up duplicated and dead client JS/TS code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
