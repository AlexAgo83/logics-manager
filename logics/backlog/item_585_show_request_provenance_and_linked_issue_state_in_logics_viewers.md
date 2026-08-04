## item_585_show_request_provenance_and_linked_issue_state_in_logics_viewers - Show request provenance and linked issue state in Logics viewers
> From version: 2.19.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer request tracking
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Operators cannot yet see the external origin and linked issue state while navigating the Logics delivery chain.

# Scope
- In:
  - Render request origin, GitHub link, and available compact issue state in local and embedded viewers.
  - Add filters or views for untriaged, linked, and blocked external requests.
  - Degrade gracefully when GitHub is not configured or unavailable.
- Out:
  - Embedding GitHub's full issue UI.
  - Editing arbitrary GitHub discussion content from the viewer.

# Acceptance criteria
- AC1: A linked request clearly shows its origin and opens the external issue safely.
- AC2: Operators can identify untriaged and active linked requests from a viewer surface.
- AC3: Missing credentials or GitHub errors produce a clear non-blocking state.
- AC4: Viewer tests cover linked, unlinked, and unavailable-provider states.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A linked request clearly shows its origin and opens the external issue safely.
- request-AC5 -> This backlog slice. Proof: AC2: Operators can identify untriaged and active linked requests from a viewer surface.
- request-AC3 -> This backlog slice. Evidence needed: A repository can provide GitHub bug and feature-request forms plus an explicit triage trigger that creates or proposes a linked Logics request.
- request-AC4 -> This backlog slice. Evidence needed: The GitHub bridge uses least-privilege credentials, treats issue content as untrusted, and requires an approval checkpoint before implementation work begins.
- request-AC6 -> This backlog slice. Evidence needed: Selected Logics lifecycle events can post traceable status updates to GitHub, while the implementation avoids a full two-way comment and field mirror.
- request-AC7 -> This backlog slice. Evidence needed: The integration is optional per repository and leaves existing Logics-only workflows unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_050_multi_channel_request_intake_and_github_issues_bridge`
- Architecture decision(s): (none yet)
- Request: `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`
- Primary task(s): `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# AI Context
- Summary: Show request provenance and linked issue state in Logics viewers
- Keywords: scaffolded-backlog, show request provenance and linked issue state in logics viewers, implementation-ready
- Use when: Implementing the scaffolded slice for Show request provenance and linked issue state in Logics viewers.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - makes the shared workflow observable
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# Notes
- Task `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery` was finished via `logics-manager flow finish task` on 2026-08-04.
