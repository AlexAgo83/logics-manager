## req_049_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls - Keep detail panel actions fixed at the bottom while content scrolls
> From version: 1.10.0
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Complexity: Medium
> Theme: Detail panel scrolling and action anchoring
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Keep the primary actions of the `Details` panel always reachable, even when the selected item has long content.
- Separate the scrollable detail content from the fixed action area at the bottom of the panel.
- Avoid layouts where users must choose between reading the item and keeping `Edit`, `Read`, `Promote`, `Done`, and `Obsolete` accessible.

# Context
The current `Details` panel can scroll as a single block.
In practice, this means the action controls at the bottom move with the content and can disappear off-screen when the detail body grows.

This is especially problematic in narrow or stacked layouts where vertical space is already constrained.
It also shows up in wider (`900px+`) horizontal layouts when the selected detail content is long enough that the bottom actions become partially visible, hard to reach, or effectively pushed below the usable viewport.
The expected behavior is closer to a split panel:
- the detail content scrolls inside its own region,
- the action controls stay fixed at the bottom,
- the action area keeps a stable height that does not depend on the content length above it.

Recent UI behavior also shows a related failure mode: the upper board/activity region can consume so much of the vertical space that the detail panel becomes partially or fully inaccessible, with no reliable way to scroll the detail content back into view.
This is especially visible when the `Activity` panel is shown above the main board/list content: it currently participates in the same upper region and can take a large share of the vertical budget before the detail panel even starts.
That means the request is not only about fixing action anchoring, but also about making scroll ownership and panel sizing predictable enough that the detail panel always remains reachable.

# Acceptance criteria
- AC1: The `Details` panel separates its scrollable content area from its bottom action area.
- AC2: The action area remains fixed and visible at the bottom of the panel while the detail content scrolls independently.
- AC3: The action area keeps a stable height and does not stretch or collapse based on the amount of detail content.
- AC4: The behavior works in both horizontal and stacked layouts.
- AC5: The change does not regress the collapsed `Details` behavior.
- AC6: The change does not hide the last lines of detail content behind the fixed actions.
- AC7: The board/activity region cannot trap the layout in a state where the detail panel becomes unreachable or non-scrollable.
- AC8: In constrained heights, the layout still guarantees that the detail panel keeps a usable visible region.
- AC9: Showing the `Activity` panel cannot consume so much height that the detail panel loses its usable viewport.
- AC10: In horizontal (`900px+`) layout, the bottom actions remain fully reachable and do not drift partially out of view when detail content grows.
- AC11: The `Activity` panel is height-bounded and scrolls internally instead of expanding without limit.
- AC12: The overall layout defines clear scroll ownership so the user does not lose access to the detail panel because multiple stacked regions compete for the same vertical budget.

# Scope
- In:
  - Refactor the `Details` panel layout so content and actions are separate vertical regions.
  - Keep the bottom action cluster anchored and non-scrolling.
  - Ensure the scrollable detail body reserves enough space so its last content remains readable.
  - Ensure stacked/narrow layouts preserve a reachable, scrollable detail region even when the upper board/activity area is long.
  - Rebalance the upper region so `Activity` does not starve the detail panel of usable height.
  - Ensure the same action anchoring and reachable-footer behavior in the horizontal layout, not only in stacked mode.
  - Add regression coverage for the new panel behavior.
- Out:
  - Changing the meaning or availability of detail actions.
  - Redesigning the visual style of the action buttons.
  - Reworking unrelated board/list scrolling behavior beyond what is needed to support this panel fix.

# Dependencies and risks
- Dependency: the detail panel must remain compatible with the existing splitter and stacked layout behaviors.
- Dependency: the layout must preserve the current collapse/expand model for the panel itself.
- Risk: if the content region sizing is wrong, the fixed actions could overlap detail content.
- Risk: if the action area height is not treated explicitly, the panel may still reflow unpredictably in narrow widths.
- Risk: stacked layout could regress if the fixed-bottom action area is implemented with assumptions that only hold in the horizontal layout.

# Clarifications
- The action area should behave like a fixed footer inside the `Details` panel, not like part of the scrollable content body.
- The detail content above it should own the scroll, not the whole panel.
- The stable bottom action area is expected to keep the main actions reachable at all times, especially in dense or long items.
- The requested behavior is about usability and action reachability, not about making the whole page more scrollable.
- The upper board/activity region should not be allowed to consume the full vertical budget such that the detail panel effectively disappears from reachable interaction.
- The `Activity` panel should be treated as part of that upper-region budget problem, not as an isolated panel with independent height growth.
- The issue is cross-layout: stacked mode makes it easier to notice, but the request must also cover the horizontal layout where the footer actions can still become partially hidden.
- The preferred implementation is to separate the fixed action footer structurally from the scrollable detail body rather than relying only on sticky positioning.
- The `Details` content area should keep a minimum usable height even when viewport height is heavily constrained.
- When vertical space gets tight, `Activity` should give up space before the detail footer does, and the upper region should rely on internal scrolling rather than unbounded growth.
- The webview should converge toward a clearer vertical budget model with one primary scroll owner per major region, so users do not end up trapped between competing scroll containers.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_054_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls.md`
