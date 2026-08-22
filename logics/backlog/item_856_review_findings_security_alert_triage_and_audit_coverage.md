## item_856_review_findings_security_alert_triage_and_audit_coverage - Review findings: security alert triage and audit coverage
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:43:05

# AI Context
- Summary: Resolve the three open high-severity CodeQL alerts and leave a reproducible shipped-dependency audit path that does not confuse host Python packages with project dependencies.
- Keywords: review, findings, security, alert, triage, audit, coverage
- Use when: preparing the security-alert remediation/dismissal implementation for CodeQL #54, #55, #56, npm audit policy, or shipped Python dependency claims.
- Skip when: fixing unrelated CI, release, or dependency-refresh work that is not needed to close the current security-alert evidence gap.

# Problem
Make the open security-alert list trustworthy: every current CodeQL alert must have an evidence-backed remediation or dismissal, and shipped dependencies must have a reproducible audit command.

# Scope
- In:
  - inspect CodeQL #54 path-injection flow through viewer file/document/fleet-root APIs
  - add or tighten adversarial tests for repository-root, symlink, absolute-path, traversal, and configured fleet-root boundaries
  - inspect CodeQL #55/#56 tunnel API-key persistence and either remediate the storage model or record the constrained dismissal rationale
  - document the POSIX owner-only guarantee and the Windows ACL boundary before any credential-storage dismissal
  - keep `npm run audit:ci` as the shipped npm audit policy and document why ambient Python package audit output is out of scope for this repository
  - close or dismiss the three GitHub CodeQL alerts with links to committed proof
- Out:
  - refreshing unrelated vulnerable dev-tool chains unless required by `npm run audit:ci`
  - adopting a new Python dependency scanner while `pyproject.toml` has no runtime dependencies
  - changing the tunnel-client authentication product model beyond what is required to make credential persistence safe and explicit

# Acceptance criteria
- AC1: Alerts #54, #55, and #56 each have a documented evidence-backed disposition: a tested fix or a GitHub dismissal linked to the guard and threat-model rationale.
- AC2: Filesystem/fleet-root handling has regression coverage proving untrusted paths cannot escape the configured workspace or root allow-list.
- AC3: Tunnel credential persistence is verified owner-only on supported POSIX platforms, and its Windows ACL limitation is documented or remediated before any CodeQL dismissal.
- AC4: The repository provides one reproducible audit command for shipped dependencies; it distinguishes project-owned dependency state from the host Python environment.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Alerts #54, #55, and #56 each have a documented evidence-backed disposition: a tested fix or a GitHub dismissal linked to the guard and threat-model rationale.
- request-AC2 -> This backlog slice. Proof: AC2: Filesystem/fleet-root handling has regression coverage proving untrusted paths cannot escape the configured workspace or root allow-list.
- request-AC3 -> This backlog slice. Proof: AC3: Tunnel credential persistence is verified owner-only on supported POSIX platforms, and its Windows ACL limitation is documented or remediated before any CodeQL dismissal.
- request-AC4 -> This backlog slice. Proof: AC4: The repository provides one reproducible audit command for shipped dependencies; it distinguishes project-owned dependency state from the host Python environment.

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
- Request: `req_380_review_findings_security_alert_triage_and_audit_coverage`
- Primary task(s): `task_392_review_findings_security_alert_triage_and_audit_coverage`

# Priority
- Priority: High
- Rationale: Three open high-severity CodeQL alerts are operator-facing security signal debt; resolve before lower-priority feature work.

# Notes
- Hybrid rationale: Derived from request `req_380_review_findings_security_alert_triage_and_audit_coverage` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_380_review_findings_security_alert_triage_and_audit_coverage.md`.
- Generated locally by logics-manager.
- Verification snapshot 2026-08-22: GitHub CodeQL open alerts are #54 `py/path-injection`, #55 `py/clear-text-storage-sensitive-data`, and #56 `py/clear-text-storage-sensitive-data`; Dependabot and secret-scanning open-alert API queries returned no rows.
- Local audit snapshot 2026-08-22: `npm run audit:ci` passed and `npm audit --omit=dev --json` reported zero production vulnerabilities.

# Tasks
- `task_392_review_findings_security_alert_triage_and_audit_coverage`
