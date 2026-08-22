## task_392_review_findings_security_alert_triage_and_audit_coverage - Review findings: security alert triage and audit coverage
> From version: 2.22.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:55:44
> Owner: codex

# AI Context
- Summary: Implement the security-alert triage slice: prove or fix viewer path boundaries, settle tunnel key storage alerts, and leave one shipped-dependency audit command.
- Keywords: review, findings, security, alert, triage, audit, coverage
- Use when: starting work on GitHub CodeQL #54, #55, #56, dependency audit policy, or the security-alert disposition evidence.
- Skip when: working on unrelated release, CI, or feature tasks that do not affect current security alerts.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_856_review_findings_security_alert_triage_and_audit_coverage`

# Acceptance criteria
- AC1: Alerts #54, #55, and #56 each have a documented evidence-backed disposition: a tested fix or a GitHub dismissal linked to the guard and threat-model rationale.
- AC2: Filesystem/fleet-root handling has regression coverage proving untrusted paths cannot escape the configured workspace or root allow-list.
- AC3: Tunnel credential persistence is verified owner-only on supported POSIX platforms, and its Windows ACL limitation is documented or remediated before any CodeQL dismissal.
- AC4: The repository provides one reproducible audit command for shipped dependencies; it distinguishes project-owned dependency state from the host Python environment.

# Plan
- [x] Re-read current GitHub CodeQL, Dependabot, and secret-scanning open alerts before coding; record alert URLs and states in the task report.
- [x] Trace CodeQL #54 through `logics_manager/viewer.py` path entry points and existing `tests/python/test_viewer_cli.py` coverage.
- [x] Add the smallest adversarial regression coverage needed for repo-root, symlink, absolute-path, traversal, and configured fleet-root escape attempts; fix shared path validation only if a test proves a real escape.
- [x] Trace CodeQL #55/#56 through `logics_manager/mcp_tunnel.py` and `tests/python/test_mcp_tunnel.py`; decide fix vs dismissal from actual storage guarantees, not alert title alone.
- [x] If dismissing #55/#56, document POSIX `0600`, secret-free messages, and Windows ACL limitation in the report and GitHub dismissal; if Windows support must be stronger, implement the minimum ACL fix and test it where feasible.
- [x] Keep dependency audit evidence bounded to shipped project dependencies: `npm run audit:ci`, `npm audit --omit=dev --json`, and `pyproject.toml` dependency state.
- [x] Run targeted tests for changed paths, `npm run audit:ci`, `rtk npm run ci:check` if code changed, `logics-manager flow validate task_392_review_findings_security_alert_triage_and_audit_coverage`, `logics-manager lint --require-status`, and `logics-manager audit --group-by-doc`.
- [x] Close or dismiss GitHub CodeQL #54/#55/#56 only after committed proof exists, then run `logics-manager flow finish task task_392_review_findings_security_alert_triage_and_audit_coverage`.

# Validation
- Passed: node scripts/run-python.mjs -m pytest tests/python/test_viewer_cli.py tests/python/test_mcp_tunnel.py (195 passed); npm run audit:ci; npm audit --omit=dev --json (0 production vulnerabilities); npm run ci:check (full local CI, including 1456 Python CLI tests and coverage floor).
- npm run ci:check passed; tests/python/test_viewer_cli.py and tests/python/test_mcp_tunnel.py passed; npm audit policy and production audit passed; GitHub CodeQL #55/#56 dismissed; #54 remediated in c028b20 for next scan.
- Finish workflow executed on 2026-08-22.
- Linked backlog/request close verification passed.

# Report
- Implemented CodeQL #54 remediation in c028b20: /api/remove-fleet-root now removes only a fleet root value already published by the trusted registry, so request JSON is not converted to an arbitrary filesystem Path. Added HTTP regression coverage for traversal-like and valid removal payloads. Dismissed CodeQL #55 and #56 on GitHub as intentional local tunnel key storage: POSIX mode 0600 is tested, secret-bearing messages are covered, and the Windows ACL boundary is documented in logics_manager/mcp_tunnel.py. Confirmed Dependabot and secret scanning have zero open alerts; npm audit policy and production audit pass.
- Finished on 2026-08-22.
- Linked backlog item(s): `item_856_review_findings_security_alert_triage_and_audit_coverage`
- Related request(s): `req_380_review_findings_security_alert_triage_and_audit_coverage`

# Links
- Request: `req_380_review_findings_security_alert_triage_and_audit_coverage`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in c028b20; #54 has a tested fix for untrusted fleet-root removal, #55/#56 were dismissed on GitHub with POSIX 0600 and Windows-boundary rationale, dependency audits passed with zero production vulnerabilities. Source: `c028b20`
- request-AC2 -> This task. Proof: Implemented in c028b20; #54 has a tested fix for untrusted fleet-root removal, #55/#56 were dismissed on GitHub with POSIX 0600 and Windows-boundary rationale, dependency audits passed with zero production vulnerabilities. Source: `c028b20`
- request-AC3 -> This task. Proof: Implemented in c028b20; #54 has a tested fix for untrusted fleet-root removal, #55/#56 were dismissed on GitHub with POSIX 0600 and Windows-boundary rationale, dependency audits passed with zero production vulnerabilities. Source: `c028b20`
- request-AC4 -> This task. Proof: Implemented in c028b20; #54 has a tested fix for untrusted fleet-root removal, #55/#56 were dismissed on GitHub with POSIX 0600 and Windows-boundary rationale, dependency audits passed with zero production vulnerabilities. Source: `c028b20`
