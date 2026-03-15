## item_043_add_compact_preview_for_items_in_the_plugin - Add compact preview for items in the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
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
- AC1/AC2 -> preview trigger and compact metadata surface are introduced. Proof: TODO.
- AC3 -> existing detail/open/read flows remain unchanged after preview integration. Proof: TODO.
- AC4 -> preview works across board/list item surfaces where supported. Proof: TODO.
- AC5 -> dismissal behavior is explicit and preserves useful state. Proof: TODO.
- AC6 -> regression tests cover preview activation and rendering. Proof: TODO.

# Priority
- Impact:
  - Medium: improves scanning efficiency and reduces unnecessary open/read actions.
- Urgency:
  - Medium-Low: useful refinement, but less foundational than search or keyboard navigation.

# Notes
- Derived from `logics/request/req_038_add_compact_preview_for_items_in_the_plugin.md`.

# Tasks
- `logics/tasks/task_037_add_compact_preview_for_items_in_the_plugin.md`
