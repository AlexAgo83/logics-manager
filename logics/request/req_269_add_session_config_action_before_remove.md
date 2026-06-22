## req_269_add_session_config_action_before_remove - Add session Config action before Remove
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 85
> Confidence: 80
> Complexity: Medium
> Theme: CDX session actions
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Add a new Config action in the session context menu.

- Add Config to the CDX session action menu before Remove.
- Preserve the existing relative order for New, Resume, and Handoff.
- Use a distinct non-danger style for Config so it is visually different from Remove.
- Open a CDX configuration modal scoped to the selected session.
- Clearly show which session is being configured.
- Allow viewing and editing CDX configuration values related to that session.
- Keep existing New, Resume, Handoff, and Remove behavior unchanged.

# Context
- The session context menu currently exposes actions such as New, Resume, Handoff, and Remove.
- Session configuration is currently not directly accessible from this menu, even though it is logically tied to a specific session. Adding a Config action here makes the workflow more direct: select a session, open its menu, configure it.
- This request only concerns adding the new menu action and opening the configuration modal. It should not change the behavior of New, Resume, Handoff, or Remove.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- AC1: The CDX session action menu renders actions in this order when all are available: New, Resume, Handoff, Config, Remove.
- AC2: Config appears before Remove even when optional actions such as Resume or Handoff are unavailable.
- AC3: Config uses a non-danger visual treatment that is distinct from the red Remove action.
- AC4: Activating Config opens a modal that identifies the selected session and exposes editable CDX configuration values for that session.
- AC5: Saving or applying configuration changes updates the relevant session configuration without changing New, Resume, Handoff, or Remove behavior.
- AC6: Viewer tests cover menu ordering, Config styling/classing, opening the modal for a selected session, and preserving existing action behavior.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries are explicit: session menu Config action and selected-session modal are in scope; unrelated CDX action behavior is out of scope.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# References
- `clients/viewer/browser-host.js`
- `clients/viewer/viewer.css`
- `tests/viewer.browser-host.test.ts`

# Risks and dependencies
- Risk: existing CDX configuration controls may be mission-form scoped; mitigate by extracting or adapting only the minimal selected-session modal behavior.
- Risk: adding a menu action can regress existing action order or click handling; mitigate by extending the current session action menu tests.

# Backlog
- `item_472_add_session_config_action_before_remove`
