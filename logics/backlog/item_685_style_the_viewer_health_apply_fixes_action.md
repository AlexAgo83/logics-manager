## item_685_style_the_viewer_health_apply_fixes_action - Style the viewer Health Apply fixes action
> From version: 2.21.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer health UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 14:05:45

# AI Context
- Summary: Style the viewer Health Apply fixes action
- Keywords: scaffolded-backlog, style the viewer health apply fixes action, implementation-ready
- Use when: Implementing the scaffolded slice for Style the viewer Health Apply fixes action.
- Skip when: The change belongs to another backlog slice.

# Problem
- The Health screen renders Apply fixes without a dedicated visual treatment, unlike the viewer's established action controls.

# Scope
- In:
  - Reuse existing button tokens and busy-state conventions.
  - Add focused rendering and interaction coverage.
  - Capture the corrected Health screen for documentation.
- Out:
  - Changing repair behavior or adding new repair kinds.

# Acceptance criteria
- Apply fixes has a clear action style and accessible focus state.
- Busy and unavailable states remain honest and legible.

# AC Traceability
- request-Apply fixes is visibly styled as a viewer action in normal, hover, focus, disabled, and busy states without reducing accessibility. -> This backlog slice. Proof: Apply fixes has a clear action style and accessible focus state.
- request-The published images are generated from the real viewer, visually inspected, and their README alt text explains the capability shown. -> This backlog slice. Proof: Busy and unavailable states remain honest and legible.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_073_visible_viewer_operational_health`
- Architecture decision(s): (none yet)
- Request: `req_329_polish_viewer_health_actions_and_document_operational_views`
- Primary task(s): `task_326_deliver_health_action_polish_and_operational_viewer_documentation`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_326_deliver_health_action_polish_and_operational_viewer_documentation`

# Notes
- Task `task_326_deliver_health_action_polish_and_operational_viewer_documentation` was finished via `logics-manager flow finish task` on 2026-08-10.
