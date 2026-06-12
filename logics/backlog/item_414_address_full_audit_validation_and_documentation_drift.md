## item_414_address_full_audit_validation_and_documentation_drift - Address full audit validation and documentation drift
> From version: 2.8.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Address the actionable follow-up from the June 12, 2026 full repository audit without mixing broad product fixes into the audit closeout.
The most important correctness gap is that `logics-manager audit --governance-profile strict` can report `ok: false`, hundreds of blocking findings, `can_continue: false`, and `release_ready: false` while the top-level CLI still exits with status 0.
Documentation and validation also need cleanup: README badges are stale, dependency audit validation is blocked by external/cache assumptions in local runs, strict governance debt is large enough to be hidden by the passing standard audit, and several high-risk runtime/viewer surfaces remain oversized or weakly covered.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc


```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|address-full-audit-validation-and-docume|req-242-address-full-audit-validation-an|address-the-actionable-follow-up-from-th|ac1-failed-audit-payloads-produce-nonzer
flowchart TD
    Request[Request source] --> Scope[Backlog scope]
    Scope --> Task[Delivery task]
```

# Acceptance criteria
- AC1: Failed audit payloads produce nonzero process exits across `logics-manager audit`, `python -m logics_manager audit`, npm wrapper invocation, and relevant npm scripts, with tests covering JSON and text modes.
- AC2: Strict governance/token-hygiene debt is either reduced or explicitly separated from release-blocking standard audit gates so operators can see when strict mode is advisory versus mandatory.
- AC3: README and release-facing badges/docs are refreshed from current repository metadata or validated by a drift check so version/test-tooling badges do not lag releases.
- AC4: Dependency audit and package validation scripts document or implement local-cache and offline behavior clearly, distinguishing unreachable registry results from clean advisory status.
- AC5: Viewer smoke skips are visible in validation summaries and CI expectations, with at least one non-skipped CI lane or documented fallback proving the local viewer shell/API path.
- AC6: High-risk oversized runtime/viewer/test files have an actionable decomposition and coverage plan focused on correctness-critical surfaces rather than cosmetic refactors.
- AC7: Follow-up validation evidence includes standard audit/lint, strict audit exit behavior, npm package dry run, dependency audit outcome, and targeted tests for the changed validation contracts.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Failed audit payloads produce nonzero process exits across `logics-manager audit`, `python -m logics_manager audit`, npm wrapper invocation, and relevant npm scripts, with tests covering JSON and text modes.
- request-AC2 -> This backlog slice. Proof: AC2: Strict governance/token-hygiene debt is either reduced or explicitly separated from release-blocking standard audit gates so operators can see when strict mode is advisory versus mandatory.
- request-AC3 -> This backlog slice. Proof: AC3: README and release-facing badges/docs are refreshed from current repository metadata or validated by a drift check so version/test-tooling badges do not lag releases.
- request-AC4 -> This backlog slice. Proof: AC4: Dependency audit and package validation scripts document or implement local-cache and offline behavior clearly, distinguishing unreachable registry results from clean advisory status.
- request-AC5 -> This backlog slice. Proof: AC5: Viewer smoke skips are visible in validation summaries and CI expectations, with at least one non-skipped CI lane or documented fallback proving the local viewer shell/API path.
- request-AC6 -> This backlog slice. Proof: AC6: High-risk oversized runtime/viewer/test files have an actionable decomposition and coverage plan focused on correctness-critical surfaces rather than cosmetic refactors.
- request-AC7 -> This backlog slice. Proof: AC7: Follow-up validation evidence includes standard audit/lint, strict audit exit behavior, npm package dry run, dependency audit outcome, and targeted tests for the changed validation contracts.

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
- Request: `logics/request/req_242_address_full_audit_validation_and_documentation_drift.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Address full audit validation and documentation drift
- Keywords: backlog-groom, request, address full audit validation and documentation drift, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Address full audit validation and documentation drift.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_242_address_full_audit_validation_and_documentation_drift` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_242_address_full_audit_validation_and_documentation_drift.md`.
- Generated locally by logics-manager.

# Tasks
- `task_217_address_full_audit_validation_and_documentation_drift`
