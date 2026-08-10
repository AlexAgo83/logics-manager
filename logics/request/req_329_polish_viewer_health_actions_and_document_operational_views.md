## req_329_polish_viewer_health_actions_and_document_operational_views - Polish viewer health actions and document operational views
> From version: 2.21.3
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer health and README documentation
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Polish viewer health actions and document operational views
- Keywords: request-chain-scaffold, polish viewer health actions and document operational views, development-ready
- Use when: You need to implement or review the scaffolded workflow for Polish viewer health actions and document operational views.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- Make the Health screen's Apply fixes action visually consistent with the rest of the viewer.
- Add focused Health and Insights screenshots to the README so the operational value of the viewer is visible before installation.

# Context
- The current README shows only the board and document reader, while Health and Insights explain validation, repair, WIP, blocked, and stale workflow state.
- The Health renderer emits a bare viewer-health__apply-fixes button without a matching CSS rule, so it does not inherit the normal action styling.
- The viewer UI campaign can produce real captures; published README assets must be cropped to the useful interface area and visually inspected before commit.

# Acceptance criteria
- Apply fixes is visibly styled as a viewer action in normal, hover, focus, disabled, and busy states without reducing accessibility.
- The README includes a cropped Health screenshot that demonstrates findings and the repair action without exposing private project content.
- The README includes a cropped Insights screenshot that demonstrates workflow shape and attention signals without duplicating the board or document screenshots.
- The published images are generated from the real viewer, visually inspected, and their README alt text explains the capability shown.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_073_visible_viewer_operational_health`
- Architecture decision(s): (none yet)

# References
- README.md
- docs/media/viewer-board.png
- docs/media/viewer-document.png
- clients/viewer/src/browser-host/render.js
- clients/viewer/src/browser-host/index.js
- clients/viewer/viewer.css
- docs/runbooks/viewer-ui-campaign.md

# Backlog
- `item_685_style_the_viewer_health_apply_fixes_action`
- `item_686_add_health_and_insights_screenshots_to_the_readme`
