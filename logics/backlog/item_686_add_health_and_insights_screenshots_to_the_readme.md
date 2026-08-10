## item_686_add_health_and_insights_screenshots_to_the_readme - Add Health and Insights screenshots to the README
> From version: 2.21.3
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer documentation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Add Health and Insights screenshots to the README
- Keywords: scaffolded-backlog, add health and insights screenshots to the readme, implementation-ready
- Use when: Implementing the scaffolded slice for Add Health and Insights screenshots to the README.
- Skip when: The change belongs to another backlog slice.

# Problem
- The README does not yet show the viewer's operational health and corpus-insight capabilities.

# Scope
- In:
  - Run the viewer capture campaign against publishable fixture data.
  - Crop and save Health and Insights images under docs/media.
  - Add concise README copy and meaningful alt text.
- Out:
  - Capturing specialized Workshop, Remote, CDX, or future MCP screens.
  - Publishing real customer or private repository data.

# Acceptance criteria
- Health and Insights each have one focused README image.
- Each image is cropped to the relevant panel and checked at README display width.

# AC Traceability
- request-The README includes a cropped Health screenshot that demonstrates findings and the repair action without exposing private project content. -> This backlog slice. Proof: Health and Insights each have one focused README image.
- request-The README includes a cropped Insights screenshot that demonstrates workflow shape and attention signals without duplicating the board or document screenshots. -> This backlog slice. Proof: Each image is cropped to the relevant panel and checked at README display width.
- request-The published images are generated from the real viewer, visually inspected, and their README alt text explains the capability shown. -> This backlog slice. Proof: Each image is cropped to the relevant panel and checked at README display width.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_073_visible_viewer_operational_health`
- Architecture decision(s): (none yet)
- Request: `req_329_polish_viewer_health_actions_and_document_operational_views`
- Primary task(s): `task_326_deliver_health_action_polish_and_operational_viewer_documentation`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
