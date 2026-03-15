## req_035_add_full_keyboard_navigation_to_the_plugin - Add full keyboard navigation to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Complexity: Medium
> Theme: Accessibility and operator productivity
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Make the plugin fully usable without relying on the mouse.
- Improve navigation speed for power users working through many Logics items.
- Extend the current accessibility baseline into a real keyboard-first interaction model.

# Context
The plugin already exposes interactive cards, list items, filters, and detail actions, but the overall experience is still largely mouse-first.
That creates avoidable friction for users who:
- move quickly through many items;
- prefer keyboard-driven workflows;
- or need stronger accessibility support.

The current surface would benefit from explicit keyboard flows for:
- moving between board cards or list items;
- moving between groups or columns;
- opening an item;
- focusing filters or details;
- triggering the main actions on the selected item.

This request is not just about tab order.
It is about making the plugin operational from the keyboard in a way that feels intentional and productive.

# Acceptance criteria
- AC1: Users can move between visible items in board and list modes using keyboard navigation.
- AC2: Users can open the selected item from the keyboard.
- AC3: Users can reach and operate main toolbar controls from the keyboard without breaking focus flow.
- AC4: Users can reach and operate detail-panel actions from the keyboard.
- AC5: Focus state remains visible and understandable throughout navigation.
- AC6: Keyboard behavior remains coherent across board mode, list mode, and responsive layouts.
- AC7: Existing mouse interactions continue to work unchanged.
- AC8: Automated tests cover at least the core keyboard navigation and action-trigger paths where practical.

# Scope
- In:
  - Keyboard navigation across board/list items.
  - Keyboard reachability for toolbar and detail actions.
  - Focus-state clarity improvements where needed.
  - Regression coverage for core keyboard flows.
- Out:
  - Introducing a full command palette inside the plugin.
  - Replacing existing mouse interactions.
  - Broad redesign of the plugin layout.

# Dependencies and risks
- Dependency: current selection model and item rendering remain the basis for keyboard navigation.
- Dependency: existing accessibility work remains the starting point, not a parallel system.
- Risk: keyboard logic can become inconsistent across board/list/responsive layouts if not centralized enough.
- Risk: new shortcuts can conflict with VS Code or browser/webview defaults if they are too aggressive.
- Risk: focus management can regress discoverability if visible focus treatment is not kept strong.

# Clarifications
- The goal is productive keyboard operation, not just WCAG checkbox compliance.
- Navigation should feel consistent with the plugin’s existing selection model.
- Board mode and list mode may need different movement semantics, but they should still feel coherent.
- The preferred outcome is “keyboard-first usable”, not merely “tabbable”.
- The recommended movement model is:
  - board mode: `Up` and `Down` move within a column, `Left` and `Right` move across columns;
  - list mode: `Up` and `Down` move within the current group, `Left` collapses a collapsible group and `Right` expands it.
- The recommended action model is:
  - `Enter` keeps the normal selection/details flow;
  - `Shift+Enter` opens `Read`;
  - `Cmd/Ctrl+Enter` opens the source document.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_040_add_full_keyboard_navigation_to_the_plugin.md`
