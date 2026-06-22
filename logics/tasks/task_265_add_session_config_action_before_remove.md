## task_265_add_session_config_action_before_remove - Add session Config action before Remove
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 85
> Confidence: 80
> Progress: 0%
> Complexity: Medium
> Theme: CDX session actions
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] `renderCdxSessionActionMenu` renders a Config action before Remove for valid CDX session rows.
- [ ] Config keeps a non-danger visual treatment distinct from `viewer-cdx__menu-action--danger`.
- [ ] Activating Config opens a selected-session CDX configuration modal.
- [ ] The modal clearly identifies the selected session and exposes editable session-related CDX configuration values.
- [ ] Existing New, Resume, Handoff, and Remove action behavior remains unchanged.
- [ ] `tests/viewer.browser-host.test.ts` covers menu order, optional-action cases, modal opening, and existing action behavior.

# Backlog
- `item_472_add_session_config_action_before_remove`

# Acceptance criteria
- AC1: Session menus include Config before Remove whenever a valid session row is rendered.
- AC2: When New, Resume, and Handoff are all available, menu order is New, Resume, Handoff, Config, Remove.
- AC3: Config still appears before Remove when Resume or Handoff is omitted by existing availability rules.
- AC4: Config has a non-danger style/class distinct from `viewer-cdx__menu-action--danger`.
- AC5: Activating Config opens a modal scoped to the selected session and shows the selected session name.
- AC6: The modal allows viewing and editing session-related CDX configuration values through the existing configuration state/update path where possible.
- AC7: Existing New, Resume, Handoff, and Remove tests and behavior continue to pass.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_265_add_session_config_action_before_remove.md` after implementation.

# Report
- Pending implementation.

# AI Context
- Summary: Implement a Config action in the CDX session menu and open a selected-session configuration modal.
- Keywords: CDX, session menu, config action, modal, browser-host, tests
- Use when: You need the bounded implementation task for the CDX session Config action.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_269_add_session_config_action_before_remove`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# Implementation notes
- Start at `clients/viewer/browser-host.js` around `renderCdxSessionActionMenu`, CDX session action event handling, and `renderCdxMissionConfigMenu`.
- If the existing configuration control is tightly coupled to the mission form, extract only the minimal shared modal/state needed for selected-session configuration.
- Keep Remove as the only danger-styled action in the menu.
- Extend the existing test "opens CDX session action menus with resume and handoff choices".
