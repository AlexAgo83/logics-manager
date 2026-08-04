## item_582_define_canonical_multi_channel_request_intake_and_provenance - Define canonical multi-channel request intake and provenance
> From version: 2.19.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Request contract and controlled creation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-04

# Problem
- Current request creation is Logics-native but does not make external or agent origin a first-class, consistent concept.

# Scope
- In:
  - Define validated request-origin and external-reference metadata.
  - Add controlled CLI/MCP-compatible request creation for human and agent callers.
  - Keep generated workflow documents and existing Logics-only creation compatible.
- Out:
  - GitHub API calls.
  - Viewer-specific rendering.
  - Unconstrained metadata editing.

# Acceptance criteria
- AC1: Supported request creation accepts a validated origin and optional external reference.
- AC2: Created requests render provenance and external links without manual Markdown edits.
- AC3: Existing request creation remains compatible when no external origin is supplied.
- AC4: Focused tests cover valid metadata, invalid origin or URL rejection, and legacy-compatible creation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Supported request creation accepts a validated origin and optional external reference.
- request-AC2 -> This backlog slice. Proof: AC2: Created requests render provenance and external links without manual Markdown edits.
- request-AC7 -> This backlog slice. Proof: AC3: Existing request creation remains compatible when no external origin is supplied.
- request-AC4 -> This backlog slice. Evidence needed: The GitHub bridge uses least-privilege credentials, treats issue content as untrusted, and requires an approval checkpoint before implementation work begins.
- request-AC5 -> This backlog slice. Evidence needed: Request-to-delivery progress is visible in Logics viewers, with direct GitHub links and a compact linked-issue state when configured.
- request-AC6 -> This backlog slice. Evidence needed: Selected Logics lifecycle events can post traceable status updates to GitHub, while the implementation avoids a full two-way comment and field mirror.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_050_multi_channel_request_intake_and_github_issues_bridge`
- Architecture decision(s): (none yet)
- Request: `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`
- Primary task(s): `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# AI Context
- Summary: Define canonical multi-channel request intake and provenance
- Keywords: scaffolded-backlog, define canonical multi-channel request intake and provenance, implementation-ready
- Use when: Implementing the scaffolded slice for Define canonical multi-channel request intake and provenance.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - establishes the contract used by every entry channel
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# Notes
- Task `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery` was finished via `logics-manager flow finish task` on 2026-08-04.
