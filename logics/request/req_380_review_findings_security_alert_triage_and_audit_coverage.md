## req_380_review_findings_security_alert_triage_and_audit_coverage - Review findings: security alert triage and audit coverage
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Security alert hygiene
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 14:43:49

# AI Context
- Summary: Triage the current high-severity CodeQL findings and make the shipped-dependency audit repeatable without treating host Python packages as project dependencies.
- Keywords: review, findings, security, alert, triage, audit, coverage
- Use when: deciding whether an open security alert is a defect or an intentional, constrained design.
- Skip when: implementing an already-triaged security fix.

# Needs
- Make the open security-alert list trustworthy: every current CodeQL alert must have an evidence-backed remediation or dismissal, and shipped dependencies must have a reproducible audit command.

# Context
- GitHub reported no open Dependabot or secret-scanning alerts on 2026-08-22. `npm audit --omit=dev --json` reported zero production vulnerabilities.
- Three high-severity CodeQL alerts remain open: #54 (path injection) and #55/#56 (clear-text sensitive-data storage). They are not confirmed vulnerabilities yet.
- Alert #54 reaches viewer filesystem/fleet-root handling. Existing code resolves paths and checks the workspace or configured-root allow-list; this needs adversarial regression coverage and a CodeQL disposition.
- Alerts #55/#56 cover the required machine-level tunnel API key. The config file is rewritten with POSIX mode `0600`; Windows ACL behavior is an acknowledged boundary. Existing tests cover POSIX mode and secret-free messages, but the security decision needs to be explicit.
- `pyproject.toml` declares no project Python dependencies. The interpreter's dependency check reported a mismatch in ambient packages, so it must not be attributed to this repository without an isolated install.

# Acceptance criteria
- AC1: Alerts #54, #55, and #56 each have a documented evidence-backed disposition: a tested fix or a GitHub dismissal linked to the guard and threat-model rationale.
- AC2: Filesystem/fleet-root handling has regression coverage proving untrusted paths cannot escape the configured workspace or root allow-list.
- AC3: Tunnel credential persistence is verified owner-only on supported POSIX platforms, and its Windows ACL limitation is documented or remediated before any CodeQL dismissal.
- AC4: The repository provides one reproducible audit command for shipped dependencies; it distinguishes project-owned dependency state from the host Python environment.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py`
- `logics_manager/mcp_tunnel.py`
- `tests/python/test_mcp_tunnel.py`
- `pyproject.toml`
- `package-lock.json`

# Backlog
- `item_856_review_findings_security_alert_triage_and_audit_coverage`
