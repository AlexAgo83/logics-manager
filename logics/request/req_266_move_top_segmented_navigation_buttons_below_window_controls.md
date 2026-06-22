## req_266_move_top_segmented_navigation_buttons_below_window_controls - Move top segmented navigation buttons below window controls
> From version: 2.12.3
> Schema version: 1.0
> Status: Draft
> Understanding: 50%
> Confidence: 50%
> Complexity: Medium
> Theme: Viewer request

# Needs
- Move the segmented navigation button groups so they are positioned directly below the native window controls, such as Close, Minimize, and Maximize.

This applies to all relevant segmented navigation groups currently displayed in the top UI area, including:

Sessions / Missions / Reports / History
Terminals / Commands / Explorer
any other repeated instance of Sessions / Missions / Reports / History

The goal is to make the app chrome clearer and more consistent by grouping these navigation controls underneath the window control area instead of having them floating or competing with the current top layout.

# Context
- The current placement of these segmented buttons makes the window header feel visually cluttered and less coherent. These controls are part of the app-level navigation, so they should sit just below the native window controls and align cleanly with the top chrome layout.
- The implementation should preserve the existing behavior of the buttons. This request is about layout and positioning only, not changing the navigation logic, labels, or selected states.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- The request has been reviewed and clarified enough to triage.
- Follow-up backlog items preserve the need and relevant context.

# Backlog
- none
