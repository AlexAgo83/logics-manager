## item_503_address_local_only_security_findings_as_defense_in_depth - Address local-only security findings as defense-in-depth
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Progress: 100%
> Complexity: Medium
> Theme: Security defense-in-depth
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Seven low/medium local-only findings: javascript: links rendered in markdown (workflowSupport.ts), path traversal via contract and changelog path templates (release.py), a Math.random CSP nonce (logicsReadPreviewHtml.ts), the import secret passed through the child environment (viewer.py), and /media/ paths resolved without URL-decoding (viewer.py).

# Scope
- In:
  - Validate the link href protocol before rendering an anchor; otherwise render a span
  - Resolve contract and changelog template paths and assert they stay within repo_root
  - Generate the CSP nonce with a CSPRNG
  - Pass the import secret via stdin instead of the child process environment
  - URL-decode /media/ paths before resolution, consistent with other resolvers
- Out:
  - Adding authentication to the local server or other architectural security changes
  - Any new dependency

# Acceptance criteria
- AC1: javascript: and other unsafe link protocols are not rendered as clickable anchors.
- AC2: Contract and changelog paths cannot escape repo_root and the CSP nonce uses a CSPRNG.
- AC3: The import secret is not exposed via the child environment and /media/ paths are URL-decoded.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: javascript: and other unsafe link protocols are not rendered as clickable anchors.
- request-AC12 -> This backlog slice. Proof: AC2: Contract and changelog paths cannot escape repo_root and the CSP nonce uses a CSPRNG.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Notes
- cdx import secret: the `cdx` CLI (v0.9.13) only accepts the passphrase via `--passphrase-env VAR`; it has no stdin mode. The secret therefore must reside in the child process environment. We scope it to a fresh per-call env dict (never the parent process) and never log it, but fully removing it from the child env is infeasible without an upstream cdx change. The four other findings (link protocol, repo-root path bounding, CSPRNG nonce, /media URL-decode) are addressed in full.

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Address local-only security findings as defense-in-depth
- Keywords: scaffolded-backlog, address local-only security findings as defense-in-depth, implementation-ready
- Use when: Implementing the scaffolded slice for Address local-only security findings as defense-in-depth.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
