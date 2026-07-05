## item_534_persist_viewer_project_last_used_order_outside_volatile_origins - Persist viewer project last-used order outside volatile origins
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer state durability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The project last-used timestamp is stored in browser localStorage.
- The VS Code embedded viewer starts on a dynamic port, so the browser origin can change and lose the localStorage-backed ordering.

# Scope
- In:
  - Move or mirror last-used project timestamps into a server-side or project-registry-backed durable store.
  - Update project switch/open flows so they write the durable timestamp when a project becomes active.
  - Teach the viewer project list to sort from the durable field while keeping browser localStorage only as an optional cache if useful.
  - Add tests that simulate a fresh embedded viewer origin while preserving the expected last-used order.
- Out:
  - Changing project discovery rules.
  - Changing the embedded viewer port allocation strategy unless it is selected as the smallest durable fix.

# Acceptance criteria
- A project opened most recently in VS Code remains first after the embedded viewer server restarts on a different port.
- Browser-host behavior remains compatible for non-VS Code users.
- Tests cover the durable ordering path rather than only same-origin localStorage.

# AC Traceability
- request-Project last-used ordering survives VS Code embedded viewer restarts and dynamic embedded-server ports. -> This backlog slice. Proof: A project opened most recently in VS Code remains first after the embedded viewer server restarts on a different port.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This backlog slice. Proof: Browser-host behavior remains compatible for non-VS Code users.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Primary task(s): `task_287_orchestrate_post_release_viewer_hardening`

# AI Context
- Summary: Persist viewer project last-used order outside volatile origins
- Keywords: scaffolded-backlog, persist viewer project last-used order outside volatile origins, implementation-ready
- Use when: Implementing the scaffolded slice for Persist viewer project last-used order outside volatile origins.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
