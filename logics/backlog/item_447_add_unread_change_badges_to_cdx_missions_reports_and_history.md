## item_447_add_unread_change_badges_to_cdx_missions_reports_and_history - Add unread change badges to CDX Missions Reports and History
> From version: 2.11.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Add unread change badges to the CDX `Missions`, `Reports`, and `History` sections in the local viewer.
Mirror the existing `Remote` / `Release` change-notification behavior: show an attention badge when a section has changed since it was last viewed, and clear that section's badge when the operator opens it.
Aggregate unread CDX section changes on the top-level `CDX` button so operators can see that one or more CDX screens need review without opening the menu.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

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

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: When refreshed CDX `Missions` data differs from the last viewed `Missions` state, the `Missions` menu item shows an unread `!` badge.
- request-AC2 -> This backlog slice. Proof: AC2: When refreshed CDX `Reports` data differs from the last viewed `Reports` state, the `Reports` menu item shows an unread `!` badge.
- request-AC3 -> This backlog slice. Proof: AC3: When refreshed CDX `History` data differs from the last viewed `History` state, the `History` menu item shows an unread `!` badge.
- request-AC4 -> This backlog slice. Proof: AC4: Opening `Missions` clears only the `Missions` unread badge and leaves `Reports` / `History` unread badges unchanged.
- request-AC5 -> This backlog slice. Proof: AC5: Opening `Reports` clears only the `Reports` unread badge and leaves `Missions` / `History` unread badges unchanged.
- request-AC6 -> This backlog slice. Proof: AC6: Opening `History` clears only the `History` unread badge and leaves `Missions` / `Reports` unread badges unchanged.
- request-AC7 -> This backlog slice. Proof: AC7: The top-level `CDX` button shows `!` when exactly one of `Missions`, `Reports`, or `History` has unread changes.
- request-AC8 -> This backlog slice. Proof: AC8: The top-level `CDX` button shows the number of unread changed sections when two or three of `Missions`, `Reports`, and `History` have unread changes.
- request-AC9 -> This backlog slice. Proof: AC9: Once all changed CDX sections have been opened, the unread-change badge on the top-level `CDX` button disappears.
- request-AC10 -> This backlog slice. Proof: AC10: Existing CDX active-session and running-run indicators continue to render correctly and are not replaced by the unread-change badge logic.
- request-AC11 -> This backlog slice. Proof: AC11: The `Missions` screen includes summary stats for available missions, available sessions, plan/preview state, and run state, using the same compact card pattern as the other CDX screens.
- request-AC12 -> This backlog slice. Proof: AC12: Tests cover unread detection, per-section clearing, top-level aggregation, `Missions` stats, and coexistence with existing CDX badges in both source and packaged viewer assets.

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
- Request: `logics/request/req_252_add_unread_change_badges_to_cdx_missions_reports_and_history.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add unread change badges to CDX Missions Reports and History
- Keywords: backlog-groom, request, add unread change badges to cdx missions reports and history, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add unread change badges to CDX Missions Reports and History.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_252_add_unread_change_badges_to_cdx_missions_reports_and_history` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_252_add_unread_change_badges_to_cdx_missions_reports_and_history.md`.
- Generated locally by logics-manager.
- Task `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_237_add_unread_change_badges_to_cdx_missions_reports_and_history`
