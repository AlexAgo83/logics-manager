## req_280_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view - Reveal card metadata footer only on focus not on hover in project view
> From version: 2.13.0
> Schema version: 1.0
> Status: Draft
> Understanding: 95
> Confidence: 92
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- In the project view, the bottom metadata block of each request/item/task card (Theme, Status, Updated) should appear only when the cell is focused, not on mouse hover.
- Goal: a calmer, less cluttered grid — the metadata reveals on intentional focus instead of flickering open every time the pointer sweeps across cards.

# Context
- The metadata block is `.card__preview`, built by `createCardPreview()` (`clients/shared-web/media/renderBoardApp.js:959-975`): it renders Theme, Status, and Updated rows (plus an optional flow-linkage row). It is `preview.hidden = true` by default.
- Each card is built by `createItemCard()` (`renderBoardApp.js:1073-1155`). The card is focusable (`role="button"`, `tabIndex = 0`, `:1093-1094`) and toggling is done by `setPreviewOpen()` (`:1104-1107`, sets `preview.hidden` and the `card--preview-open` class).
- The preview currently opens on BOTH hover and focus (`:1150-1153`):
  ```js
  card.addEventListener("mouseenter", () => setPreviewOpen(true));
  card.addEventListener("mouseleave", () => setPreviewOpen(false));
  card.addEventListener("focus",      () => setPreviewOpen(true));
  card.addEventListener("blur",       () => setPreviewOpen(false));
  ```
  Two distinct things make the footer visible without a deliberate hover:
  1. **Focus persists on the selected card.** Selecting/clicking a card focuses it, and focus is restored across re-renders (focus-capture/restore in the render cycle), so the active card stays focused and its footer stays open continuously — this is what is seen "before any hover".
  2. **Hover opens it on any card** the pointer passes over (the `mouseenter`/`mouseleave` pair), adding sweep noise.
- Supporting styling already exists: `.card--preview-open` (`clients/shared-web/media/css/board.css:181-183`) and `.card:focus-visible` (`:514-518`). Escape already closes an open preview (`renderBoardApp.js:1143-1145`).
- `createItemCard()` is shared across board/list/compact card rendering, so removing the hover trigger affects every view that uses it unless explicitly scoped — see Risks.

# Decisions
- Reveal the `.card__preview` footer on **focus/blur only**; drop the `mouseenter`/`mouseleave` triggers (`renderBoardApp.js:1150-1151`). Keep `focus`/`blur` (`:1152-1153`) and the existing Escape-to-close.
- No new markup, CSS, or state — the hidden-by-default + `setPreviewOpen` machinery already does the work; this is a trigger change only.
- Clicking a card already focuses it (and selects it), so mouse users still get the footer on an intentional click — consistent with the "reveal on intent, not on sweep" goal.
- **Intended (confirmed):** the selected/active card keeps its footer open continuously while it stays focused (focus persists across re-renders). This is the desired behavior, NOT a bug to fix — do not suppress the footer on the focused/selected card.

# Acceptance criteria
- AC1: In the project view, a card's bottom metadata block (Theme/Status/Updated) stays hidden while the pointer merely hovers the card.
- AC2: The metadata block appears when the card receives focus (keyboard Tab or click) and hides again on blur.
- AC3: Escape still closes an open metadata block (no regression to `renderBoardApp.js:1143-1145`).
- AC4: No change to which fields are shown, their order, or the rest of the card (title, badges, linkage row).
- AC5: Keyboard navigation and the focus-visible outline still work; the card stays reachable and operable.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope
- In: change the reveal trigger of `.card__preview` from hover+focus to focus-only in `createItemCard()`.
- Out: redesigning the card; changing which metadata fields appear; animations/hover open-delay; the detail panel; CSS-only `:has()` rewrites.

# Risks / Open questions
- Mouse-only users lose the passive hover peek — they must click (which focuses) to see the footer. This is the intended trade-off; if it proves too hidden, the documented fallback is a hover with a short open-delay (anti-flicker) kept alongside focus. (decision: focus-only first.)
- `createItemCard()` is shared. Open question: apply focus-only everywhere it renders cards, or gate to the project view only (would need a view-mode check). Recommended: apply globally for consistency unless list/compact views must keep hover.
- Confirm no other path force-opens the preview (e.g. a selected state that sets `card--preview-open`) that would keep it visible regardless of the trigger change.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/renderBoardApp.js:959-975` (`createCardPreview` — the footer markup)
- `clients/shared-web/media/renderBoardApp.js:1104-1107` (`setPreviewOpen`)
- `clients/shared-web/media/renderBoardApp.js:1150-1153` (hover+focus listeners — the change site)
- `clients/shared-web/media/renderBoardApp.js:1143-1145` (Escape-to-close)
- `clients/shared-web/media/css/board.css:181-183` (`.card--preview-open`), `:514-518` (`.card:focus-visible`)

# AI Context
- Summary: Make the card metadata footer (Theme/Status/Updated) reveal on focus only, not on hover, in the project view by dropping the two mouseenter/mouseleave listeners in createItemCard and keeping focus/blur.
- Keywords: viewer, project-view, card-preview, focus, hover, declutter, renderBoardApp
- Use when: changing the card metadata reveal behavior in the board/project view.
- Skip when: working on the card content, the detail panel, or other viewer surfaces.
# Backlog
- none
- `item_507_reveal_card_metadata_footer_only_on_focus_not_on_hover_in_project_view`
