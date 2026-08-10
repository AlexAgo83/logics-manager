## item_684_use_the_logics_icon_as_the_viewer_topbar_identity - Use the Logics icon as the viewer topbar identity
> From version: 2.21.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer visual identity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Use the Logics icon as the viewer topbar identity
- Keywords: scaffolded-backlog, use the logics icon as the viewer topbar identity, implementation-ready
- Use when: Implementing the scaffolded slice for Use the Logics icon as the viewer topbar identity.
- Skip when: The change belongs to another backlog slice.

# Problem
- The written viewer title uses space in the compact topbar even though a recognizable packaged icon is available.

# Scope
- In:
  - Replace the visible title with the existing viewer icon.
  - Use CSS sizing that preserves the current topbar height and compact layout.
  - Provide accessible naming without duplicate visible copy and add focused coverage.
- Out:
  - Changing navigation, project selection, or other topbar controls.
  - Creating, regenerating, or modifying icon assets.

# Acceptance criteria
- The icon appears before the project selector and the title is not visibly rendered.
- The topbar height remains unchanged in the normal viewer layout.
- Screen readers retain a meaningful viewer identity label.

# AC Traceability
- request-The visible Logics Viewer text is replaced by the packaged Logics icon before the project selector. -> This backlog slice. Proof: The icon appears before the project selector and the title is not visibly rendered.
- request-The logo is discreet, preserves the existing topbar height, and does not cause layout overflow at compact widths. -> This backlog slice. Proof: The topbar height remains unchanged in the normal viewer layout.
- request-The identity remains accessible through suitable semantic text or an aria-label and a viewer test covers the new header markup. -> This backlog slice. Proof: Screen readers retain a meaningful viewer identity label.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_072_compact_logics_viewer_identity`
- Architecture decision(s): (none yet)
- Request: `req_328_replace_the_viewer_title_with_a_compact_logics_logo`
- Primary task(s): `task_325_deliver_compact_viewer_logo_identity`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.
