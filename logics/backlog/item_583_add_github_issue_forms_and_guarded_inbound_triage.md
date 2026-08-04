## item_583_add_github_issue_forms_and_guarded_inbound_triage - Add GitHub Issue forms and guarded inbound triage
> From version: 2.19.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: GitHub intake
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- GitHub issues have no standardized, guarded path into the Logics corpus.

# Scope
- In:
  - Provide bug and feature request form templates.
  - Define labels and an explicit triage trigger.
  - Create a GitHub Action or equivalent adapter that proposes a linked Logics request on a reviewable branch or pull request.
  - Validate payloads and use minimal GitHub permissions.
- Out:
  - Automatic task start.
  - Automatic implementation or code execution.
  - Public confidential-reporting workflow beyond GitHub security reporting guidance.

# Acceptance criteria
- AC1: Forms collect the minimum structured information for bugs and requests.
- AC2: Only an explicit triage trigger invokes the bridge.
- AC3: The bridge creates a reviewable linked Request and reports its ref back to the issue.
- AC4: Tests cover trusted event handling, malformed payload refusal, duplicate delivery handling, and permission boundaries.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Forms collect the minimum structured information for bugs and requests.
- request-AC4 -> This backlog slice. Proof: AC2: Only an explicit triage trigger invokes the bridge.
- request-AC7 -> This backlog slice. Proof: AC3: The bridge creates a reviewable linked Request and reports its ref back to the issue.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_050_multi_channel_request_intake_and_github_issues_bridge`
- Architecture decision(s): (none yet)
- Request: `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`
- Primary task(s): `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# AI Context
- Summary: Add GitHub Issue forms and guarded inbound triage
- Keywords: scaffolded-backlog, add github issue forms and guarded inbound triage, implementation-ready
- Use when: Implementing the scaffolded slice for Add GitHub Issue forms and guarded inbound triage.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - delivers the first external request path
- Rationale: Set by scaffold input or defaulted for grooming.
