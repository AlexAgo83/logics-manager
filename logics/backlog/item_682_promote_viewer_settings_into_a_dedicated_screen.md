## item_682_promote_viewer_settings_into_a_dedicated_screen - Promote viewer settings into a dedicated screen
> From version: 2.21.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer settings UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Promote viewer settings into a dedicated screen
- Keywords: scaffolded-backlog, promote viewer settings into a dedicated screen, implementation-ready
- Use when: Implementing the scaffolded slice for Promote viewer settings into a dedicated screen.
- Skip when: The change belongs to another backlog slice.

# Problem
- The Settings popover now contains multiple unrelated operational groups and is no longer scannable.

# Scope
- In:
  - Turn Settings into a viewer screen with refresh, workspace and corpus, terminal, server, VS Code, and about groups.
  - Preserve all existing actions and embedded VS Code visibility boundaries.
  - Keep the topbar Settings button as the single entry point.
- Out:
  - A general preference framework or unrelated topbar redesign.
  - Moving Workshop, Remote, or CDX content into Settings.

# Acceptance criteria
- Settings opens a full viewer screen rather than an accordion popover.
- Every existing settings action remains available in a labelled group.
- The embedded viewer exposes only the controls it can execute.

# AC Traceability
- request-Settings opens a dedicated viewer screen with all existing controls grouped into understandable sections and no control is lost for browser or embedded VS Code users. -> This backlog slice. Proof: Settings opens a full viewer screen rather than an accordion popover.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> This backlog slice. Proof: Every existing settings action remains available in a labelled group.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_071_direct_viewer_operations_for_workflow_chains_and_chatgpt_mcp`
- Architecture decision(s): (none yet)
- Request: `req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct`
- Primary task(s): `task_324_deliver_direct_viewer_chain_settings_and_chatgpt_mcp_controls`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
