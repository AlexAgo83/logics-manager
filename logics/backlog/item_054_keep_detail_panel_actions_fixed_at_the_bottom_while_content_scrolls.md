## item_054_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls - Keep detail panel actions fixed at the bottom while content scrolls
> From version: 1.10.0
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Progress: 100%
> Complexity: Medium
> Theme: Detail panel scrolling and action anchoring
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The `Details` panel currently mixes long content and bottom actions in a way that makes action reachability unreliable.
Depending on layout, content length, and whether `Activity` is open, the action footer can drift partially out of view, or the detail region can lose too much height to stay meaningfully usable.

This affects both stacked and horizontal layouts.
The plugin needs a clearer vertical budget and clearer scroll ownership so `Details` stays reachable and its actions stay anchored.

# Scope
- In:
  - Separate the scrollable detail body from a fixed bottom action area.
  - Keep the bottom action cluster anchored with a stable height.
  - Ensure the detail body keeps a usable viewport in stacked and horizontal layouts.
  - Prevent `Activity` and the upper browsing region from starving `Details` of usable height.
  - Add regression coverage for the new layout behavior.
- Out:
  - Changing the meaning of detail actions.
  - Redesigning button styling for its own sake.
  - Reworking unrelated board/list behavior beyond what is necessary to stabilize vertical layout ownership.

# Acceptance criteria
- AC1: The `Details` panel separates its scrollable content area from its bottom action area.
- AC2: The action area remains fixed and visible at the bottom while the detail content scrolls independently.
- AC3: The action area keeps a stable height.
- AC4: The behavior works in both horizontal and stacked layouts.
- AC5: The collapsed `Details` behavior does not regress.
- AC6: Detail content is not hidden behind the fixed action area.
- AC7: The upper board/activity region cannot trap the layout in a state where the detail panel becomes unreachable or non-scrollable.
- AC8: In constrained heights, the detail panel still keeps a usable visible region.
- AC9: Showing `Activity` cannot consume so much height that the detail panel loses its usable viewport.
- AC10: In horizontal layout, the bottom actions remain fully reachable when detail content grows.
- AC11: `Activity` is height-bounded and scrolls internally instead of expanding without limit.
- AC12: Scroll ownership stays clear enough that users do not get trapped between competing vertical scroll regions.

# Priority
- Impact:
  - High: this directly affects the ability to read details and trigger primary actions.
- Urgency:
  - High: the issue is already visible in multiple real usage scenarios and layouts.

# Notes
- Derived from `logics/request/req_049_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls.md`.
- Prefer a structural separation between the fixed action footer and the scrollable detail body rather than relying only on sticky positioning.
- When vertical space gets tight, `Activity` should give up space before the detail footer does.
- This item is really about vertical layout ownership, not just about pinning buttons.

# Tasks
- `logics/tasks/task_059_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls.md`
