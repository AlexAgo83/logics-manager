## item_681_embed_the_bounded_workflow_chain_in_document_detail - Embed the bounded workflow chain in document detail
> From version: 2.21.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer document navigation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 12:29:03

# AI Context
- Summary: Embed the bounded workflow chain in document detail
- Keywords: scaffolded-backlog, embed the bounded workflow chain in document detail, implementation-ready
- Use when: Implementing the scaffolded slice for Embed the bounded workflow chain in document detail.
- Skip when: The change belongs to another backlog slice.

# Problem
- The existing Graph button replaces the current document with a separate graph screen, breaking reading flow for a small linked chain.

# Scope
- In:
  - Reuse /api/chain-graph and the current Mermaid rendering path in the document detail layout.
  - Render only request, backlog, and task detail chains in a visible, compact, height-limited frame and preserve clickable node navigation.
  - Remove the superseded document Graph action and cover loading, empty-chain, and click behavior.
- Out:
  - Full-corpus dependency exploration.
  - Changing chain graph API semantics beyond what inline rendering needs.

# Acceptance criteria
- A linked workflow document displays a visible-by-default, compact, clickable, height-limited chain before its Markdown body.
- A document without a resolved chain remains readable without a blank or failing graph frame.
- The detail action bar no longer contains the separate Graph button.

# AC Traceability
- request-Opening a request, backlog item, or task shows its bounded linked chain at the top of the detail page; graph nodes open their referenced document and documents without a chain remain readable. -> This backlog slice. Proof: A linked workflow document displays a compact, clickable chain before its Markdown body.
- request-The former Graph action is removed once the inline chain is available, and the viewer never performs a full-corpus graph scan to render it. -> This backlog slice. Proof: A document without a resolved chain remains readable without a blank or failing graph frame.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> This backlog slice. Proof: The detail action bar no longer contains the separate Graph button.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_071_direct_viewer_operations_for_workflow_chains_and_chatgpt_mcp`
- Architecture decision(s): (none yet)
- Request: `req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct`
- Primary task(s): `task_324_deliver_direct_viewer_chain_settings_and_chatgpt_mcp_controls`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
