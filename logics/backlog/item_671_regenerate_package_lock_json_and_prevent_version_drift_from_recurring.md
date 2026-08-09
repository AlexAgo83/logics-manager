## item_671_regenerate_package_lock_json_and_prevent_version_drift_from_recurring - Regenerate package-lock.json and prevent version drift from recurring
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:02:57

# AI Context
- Summary: Regenerate package-lock.json and prevent version drift from recurring
- Keywords: backlog-groom, request, regenerate package-lock.json and prevent version drift from recurring, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Regenerate package-lock.json and prevent version drift from recurring.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`package-lock.json`'s `version` field (`2.21.0`) is stale by one patch version against `package.json`'s `"version": "2.21.1"` - the lockfile was not regenerated on the last version bump. Nothing today checks lockfile/manifest version parity, so the same drift will recur on the next release unless a check is added, not just a one-time fix.

# Scope
- In:
  - Regenerate `package-lock.json` (e.g. `npm install`) so its `version` field matches `package.json`'s current version.
  - Add a check that catches this drift going forward - either as part of `logics_manager/release.py`'s existing version-source cross-check (`_discover_version_sources`), or as a small addition to `scripts/ci-check.mjs`.
- Out:
  - Any dependency version bump beyond what regenerating the lockfile naturally does.
  - The path-guard consolidation, the mcp.py/flow module extractions, the coverage-floor fix, and the `assist_workflow.py` test gap - each is its own sibling backlog item.

# Acceptance criteria
- AC5: `package-lock.json` is regenerated and its version field matches `package.json`, and a check exists that would have caught this drift before it shipped.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: `package-lock.json` is regenerated and its version field matches `package.json`, with a recurrence-preventing check in place.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`
- Primary task(s): `task_320_orchestrate_the_review_findings_cleanup`

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_323_review_findings_security_tests_structure_dependencies` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`.
- Generated locally by logics-manager.
