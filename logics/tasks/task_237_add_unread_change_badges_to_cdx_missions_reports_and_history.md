## task_237_add_unread_change_badges_to_cdx_missions_reports_and_history - Add unread change badges to CDX Missions Reports and History
> From version: 2.11.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_447_add_unread_change_badges_to_cdx_missions_reports_and_history`

# Acceptance criteria
- AC1: When refreshed CDX `Missions` data differs from the last viewed `Missions` state, the `Missions` menu item shows an unread `!` badge.
- AC2: When refreshed CDX `Reports` data differs from the last viewed `Reports` state, the `Reports` menu item shows an unread `!` badge.
- AC3: When refreshed CDX `History` data differs from the last viewed `History` state, the `History` menu item shows an unread `!` badge.
- AC4: Opening `Missions` clears only the `Missions` unread badge and leaves `Reports` / `History` unread badges unchanged.
- AC5: Opening `Reports` clears only the `Reports` unread badge and leaves `Missions` / `History` unread badges unchanged.
- AC6: Opening `History` clears only the `History` unread badge and leaves `Missions` / `Reports` unread badges unchanged.
- AC7: The top-level `CDX` button shows `!` when exactly one of `Missions`, `Reports`, or `History` has unread changes.
- AC8: The top-level `CDX` button shows the number of unread changed sections when two or three of `Missions`, `Reports`, and `History` have unread changes.
- AC9: Once all changed CDX sections have been opened, the unread-change badge on the top-level `CDX` button disappears.
- AC10: Existing CDX active-session and running-run indicators continue to render correctly and are not replaced by the unread-change badge logic.
- AC11: The `Missions` screen includes summary stats for available missions, available sessions, plan/preview state, and run state, using the same compact card pattern as the other CDX screens.
- AC12: Tests cover unread detection, per-section clearing, top-level aggregation, `Missions` stats, and coexistence with existing CDX badges in both source and packaged viewer assets.

# Validation
- Passed: `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts` (107 tests).
- Passed: `rtk python -m pytest tests/python/test_logics_manager_cli.py -k cdx_mission` (19 selected tests).
- Passed: `logics-manager lint --require-status`.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implemented CDX unread state tracking for Missions, Reports, and History from the consolidated status refresh payload.
- Added per-section menu badges, top-level CDX aggregation (`!` for one unread section, count for multiple), and per-screen acknowledgement on open.
- Preserved existing CDX active session and running run badges alongside unread badges.
- Updated source and packaged viewer assets and added browser-host coverage for detection, clearing, aggregation, Missions stats, and badge coexistence.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_447_add_unread_change_badges_to_cdx_missions_reports_and_history`
- Related request(s): `req_252_add_unread_change_badges_to_cdx_missions_reports_and_history`

# AI Context
- Summary: Implement add unread change badges to cdx missions reports and history.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_252_add_unread_change_badges_to_cdx_missions_reports_and_history`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC2 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC3 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC4 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC5 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC6 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC7 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC8 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC9 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC10 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC11 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
- request-AC12 -> This task. Proof: Dev-ready chain created: task_237 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
