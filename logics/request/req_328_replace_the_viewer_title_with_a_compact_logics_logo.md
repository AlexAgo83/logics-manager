## req_328_replace_the_viewer_title_with_a_compact_logics_logo - Replace the viewer title with a compact Logics logo
> From version: 2.21.3
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Viewer visual identity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Replace the viewer title with a compact Logics logo
- Keywords: request-chain-scaffold, replace the viewer title with a compact logics logo, development-ready
- Use when: You need to implement or review the scaffolded workflow for Replace the viewer title with a compact Logics logo.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- Replace the visible Logics Viewer title before the project selector with the Logics logo.
- Keep the viewer topbar at its current height and retain accessible identification of the viewer.

# Context
- The viewer now has a packaged 1024px Logics icon used by the extension and favicon.
- The title and project selector share the viewer-topbar identity row, so the change must not change its alignment or topbar height.

# Acceptance criteria
- The visible Logics Viewer text is replaced by the packaged Logics icon before the project selector.
- The logo is discreet, preserves the existing topbar height, and does not cause layout overflow at compact widths.
- The identity remains accessible through suitable semantic text or an aria-label and a viewer test covers the new header markup.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_072_compact_logics_viewer_identity`
- Architecture decision(s): (none yet)

# References
- clients/viewer/index.html
- clients/viewer/viewer.css
- clients/shared-web/media/viewer-icon.png
- tests/viewer.browser-host.test.ts

# Backlog
- `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`
