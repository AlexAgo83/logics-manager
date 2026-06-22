## task_265_add_session_config_action_before_remove - Add session Config action before Remove
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 85
> Confidence: 80
> Progress: 100%
> Complexity: Medium
> Theme: CDX session actions
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] `renderCdxSessionActionMenu` renders a Config action before Remove for valid CDX session rows.
- [x] Config keeps a non-danger visual treatment distinct from `viewer-cdx__menu-action--danger`.
- [x] Activating Config opens a selected-session CDX configuration modal.
- [x] The modal clearly identifies the selected session and exposes editable session-related CDX configuration values.
- [x] Existing New, Resume, Handoff, and Remove action behavior remains unchanged.
- [x] `tests/viewer.browser-host.test.ts` covers menu order, optional-action cases, modal opening, and existing action behavior.

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

# AC Traceability
- request-AC1 -> This task. Proof: `renderCdxSessionActionMenu` renders a `Config` action before `Remove` for named CDX session rows.
- request-AC2 -> This task. Proof: `tests/viewer.browser-host.test.ts` asserts the full `New`, `Resume`, `Handoff`, `Config`, `Remove` order when all optional actions are present.
- request-AC3 -> This task. Proof: the same test asserts `Config` remains before `Remove` when `Handoff` is absent and for disabled rows where New/Resume are omitted.
- request-AC4 -> This task. Proof: `Config` uses `viewer-cdx__menu-action` without `viewer-cdx__menu-action--danger`; the test asserts only `Remove` is danger-styled.
- request-AC5 -> This task. Proof: activating `Config` opens a themed modal whose copy includes the selected session name.
- request-AC6 -> This task. Proof: modal model/reasoning/power fields update `latestCdxMissionState` and are restored in the CDX mission configuration controls.
- request-AC7 -> This task. Proof: `npx vitest run tests/viewer.browser-host.test.ts` passes with existing New, Resume, Handoff, and Remove behavior covered.
- backlog-AC1..AC7 -> This task. Proof: implemented the full session Config action slice in `clients/viewer/browser-host.js`, synced `viewer_assets/viewer/`, and extended the targeted viewer test.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_265_add_session_config_action_before_remove.md` after implementation.
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implemented a non-danger `Config` action before `Remove` in CDX session menus.
- Added a selected-session configuration modal for model, reasoning, and power values using the existing CDX mission configuration state.
- Extended viewer tests for action order, optional-action cases, modal opening/editing, and unchanged Resume/Handoff/Remove behavior.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_472_add_session_config_action_before_remove`
- Related request(s): `req_269_add_session_config_action_before_remove`

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
