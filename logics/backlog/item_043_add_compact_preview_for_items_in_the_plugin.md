## item_043_add_compact_preview_for_items_in_the_plugin - Add compact preview for items in the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Information preview and navigation efficiency
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
Opening or reading an item can feel too heavy when users only want a quick confirmation that they are looking at the right thing. The current flow jumps from visible item surfaces to full details or read/open behavior without a lighter inspection layer.

A compact preview would reduce that friction and make scanning denser workspaces faster.

# Scope
- In:
  - Add a compact preview interaction for items.
  - Expose a concise, high-value information set.
  - Preserve current detail/open/read behaviors.
  - Keep dismissal and interaction behavior clean.
  - Add regression coverage for the preview flow.
- Out:
  - Replacing the detail panel.
  - Full markdown rendering inside the preview.
  - A second full reader view.

# Acceptance criteria
- AC1: Users can trigger a compact preview without opening the full read flow.
- AC2: The preview exposes a concise set of high-value metadata.
- AC3: The preview does not regress the current detail panel and read/open actions.
- AC4: The preview behaves coherently in board mode and list mode where applicable.
- AC5: The preview can be dismissed cleanly without disrupting selection state.
- AC6: Tests cover the preview trigger and visible content where practical.

# AC Traceability
- AC1/AC2 -> item cards now expose a compact preview surface on hover/focus with a concise metadata set: status, updated date, references, used-by, and flow summary where relevant. Proof: `media/renderBoard.js`.
- AC3 -> preview rendering lives inside the card surface and does not alter the existing detail, open, or read actions. Proof: `media/renderBoard.js`.
- AC4 -> the preview is attached to the shared item-card component used in board and list modes. Proof: `media/renderBoard.js`.
- AC5 -> preview dismissal is handled on mouse leave, blur, or `Escape` without changing the current selection. Proof: `media/renderBoard.js`, `tests/webview.harness-a11y.test.ts`.
- AC6 -> harness coverage verifies preview visibility and dismissal behavior. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium: improves scanning efficiency and reduces unnecessary open/read actions.
- Urgency:
  - Medium-Low: useful refinement, but less foundational than search or keyboard navigation.

# Notes
- Derived from `logics/request/req_038_add_compact_preview_for_items_in_the_plugin.md`.

# Tasks
- `logics/tasks/task_037_add_compact_preview_for_items_in_the_plugin.md`
