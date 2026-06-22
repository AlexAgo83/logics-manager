## item_472_add_session_config_action_before_remove - Add session Config action before Remove
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 85
> Confidence: 80
> Progress: 100%
> Complexity: Medium
> Theme: CDX session actions
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
CDX session configuration is available in the mission configuration area, but not from the session action menu. Operators need a direct Config action on a selected session, placed before the destructive Remove action, so they can inspect and edit session-specific CDX settings without leaving the status/session context.

# Scope
- In:
  - Add a Config action to the CDX session action menu before Remove.
  - Preserve the existing New, Resume, Handoff, and Remove actions and availability rules.
  - Reuse or adapt the existing CDX configuration modal/control pattern for the selected session.
  - Show the selected session name clearly in the modal.
  - Add tests for action order, non-danger styling, modal opening, and unchanged existing actions.
- Out:
  - Redesigning the CDX mission configuration UI.
  - Changing the semantics of New, Resume, Handoff, or Remove.
  - Adding global CDX provider management beyond the selected session.

# Acceptance criteria
- AC1: Session menus include Config before Remove whenever a valid session row is rendered.
- AC2: When New, Resume, and Handoff are all available, menu order is New, Resume, Handoff, Config, Remove.
- AC3: Config still appears before Remove when Resume or Handoff is omitted by existing availability rules.
- AC4: Config has a non-danger style/class distinct from `viewer-cdx__menu-action--danger`.
- AC5: Activating Config opens a modal scoped to the selected session and shows the selected session name.
- AC6: The modal allows viewing and editing session-related CDX configuration values through the existing configuration state/update path where possible.
- AC7: Existing New, Resume, Handoff, and Remove tests and behavior continue to pass.

# AC Traceability
- request-AC1 -> AC1 and AC2. Proof: The backlog requires the requested Config action in the expected menu order.
- request-AC2 -> AC3. Proof: The backlog preserves placement before Remove under optional action availability.
- request-AC3 -> AC4. Proof: The backlog requires non-danger styling distinct from Remove.
- request-AC4 -> AC5 and AC6. Proof: The backlog requires a selected-session configuration modal with editable values.
- request-AC5 -> AC7. Proof: The backlog explicitly preserves existing session action behavior.
- request-AC6 -> AC7. Proof: The backlog requires tests around the new and existing action behaviors.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_269_add_session_config_action_before_remove.md`
- Primary task(s): `logics/tasks/task_265_add_session_config_action_before_remove.md`

# AI Context
- Summary: Add a non-danger Config action to CDX session menus before Remove and open a selected-session configuration modal.
- Keywords: CDX, session menu, Config action, modal, viewer, browser-host
- Use when: Implementing or reviewing the CDX session action menu Config slice.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
  - Medium: makes per-session CDX configuration reachable from the status/session workflow.
- Urgency:
  - Medium: improves an existing operational path without requiring a broader redesign.

# Notes
- Hybrid rationale: Derived from request `req_269_add_session_config_action_before_remove` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_269_add_session_config_action_before_remove.md`.
- Generated locally by logics-manager.
- Likely implementation surface: `clients/viewer/browser-host.js` around `renderCdxSessionActionMenu`, CDX action click handling, and `renderCdxMissionConfigMenu`; `clients/viewer/viewer.css` for any Config action styling; `tests/viewer.browser-host.test.ts` around the existing session menu tests.
- If the current configuration UI is mission-scoped, adapt it carefully so the modal state is initialized from the selected session instead of the currently selected mission form session.
- Task `task_265_add_session_config_action_before_remove` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_265_add_session_config_action_before_remove`
