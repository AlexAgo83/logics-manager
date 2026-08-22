## task_392_review_findings_security_alert_triage_and_audit_coverage - Review findings: security alert triage and audit coverage
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:42:48

# AI Context
- Summary: Implement the security-alert triage slice: prove or fix viewer path boundaries, settle tunnel key storage alerts, and leave one shipped-dependency audit command.
- Keywords: review, findings, security, alert, triage, audit, coverage
- Use when: starting work on GitHub CodeQL #54, #55, #56, dependency audit policy, or the security-alert disposition evidence.
- Skip when: working on unrelated release, CI, or feature tasks that do not affect current security alerts.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_856_review_findings_security_alert_triage_and_audit_coverage`

# Acceptance criteria
- AC1: Alerts #54, #55, and #56 each have a documented evidence-backed disposition: a tested fix or a GitHub dismissal linked to the guard and threat-model rationale.
- AC2: Filesystem/fleet-root handling has regression coverage proving untrusted paths cannot escape the configured workspace or root allow-list.
- AC3: Tunnel credential persistence is verified owner-only on supported POSIX platforms, and its Windows ACL limitation is documented or remediated before any CodeQL dismissal.
- AC4: The repository provides one reproducible audit command for shipped dependencies; it distinguishes project-owned dependency state from the host Python environment.

# Plan
- [ ] Re-read current GitHub CodeQL, Dependabot, and secret-scanning open alerts before coding; record alert URLs and states in the task report.
- [ ] Trace CodeQL #54 through `logics_manager/viewer.py` path entry points and existing `tests/python/test_viewer_cli.py` coverage.
- [ ] Add the smallest adversarial regression coverage needed for repo-root, symlink, absolute-path, traversal, and configured fleet-root escape attempts; fix shared path validation only if a test proves a real escape.
- [ ] Trace CodeQL #55/#56 through `logics_manager/mcp_tunnel.py` and `tests/python/test_mcp_tunnel.py`; decide fix vs dismissal from actual storage guarantees, not alert title alone.
- [ ] If dismissing #55/#56, document POSIX `0600`, secret-free messages, and Windows ACL limitation in the report and GitHub dismissal; if Windows support must be stronger, implement the minimum ACL fix and test it where feasible.
- [ ] Keep dependency audit evidence bounded to shipped project dependencies: `npm run audit:ci`, `npm audit --omit=dev --json`, and `pyproject.toml` dependency state.
- [ ] Run targeted tests for changed paths, `npm run audit:ci`, `rtk npm run ci:check` if code changed, `logics-manager flow validate task_392_review_findings_security_alert_triage_and_audit_coverage`, `logics-manager lint --require-status`, and `logics-manager audit --group-by-doc`.
- [ ] Close or dismiss GitHub CodeQL #54/#55/#56 only after committed proof exists, then run `logics-manager flow finish task task_392_review_findings_security_alert_triage_and_audit_coverage`.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_380_review_findings_security_alert_triage_and_audit_coverage`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
