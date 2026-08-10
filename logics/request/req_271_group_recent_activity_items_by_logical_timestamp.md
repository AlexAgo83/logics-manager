## req_271_group_recent_activity_items_by_logical_timestamp - Group Recent Activity items by logical timestamp
> Status: Done
> Schema version: 1.0
> From version: 2.12.7
> Understanding: 90
> Confidence: 85
> Complexity: Medium
> Theme: Viewer request
> Indicators reviewed: 2026-08-10 09:06:28

# Needs
- Update the Recent Activity view so activity cells are grouped by logical timestamp.

Items that belong to the same timestamp bucket should be displayed under a shared timestamp label instead of repeating the update time inside each cell.

Expected behavior:

activity items updated within the same minute should be grouped together
each group should display a timestamp label above the grouped items, for example 2 minutes ago
the existing per-cell Updated: ... line should be removed or moved to the group header, since it becomes redundant
the grouping should keep the current chronological ordering, with the most recent group first
the grouping should work consistently for relative timestamps such as seconds, minutes, hours, and days
the visual layout should stay compact and readable in the current dark theme

# Context
- The Recent Activity view currently repeats the same Updated: ... information inside every activity cell. When many documents are updated at the same time, this creates visual noise and makes the list feel artificially longer.
- Grouping related activity items by logical timestamp would make the activity feed easier to scan. For example, if several documents were updated within the same minute, the view should show a single group label like 4 minutes ago, followed by all matching activity items.
- This request is about improving the Recent Activity layout and timestamp presentation. It should not change how activity items are generated, sorted, or linked to documents.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- AC1: The request has been reviewed and clarified enough to triage.
- AC2: Follow-up backlog items preserve the need and relevant context.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `item_480_group_recent_activity_items_by_logical_timestamp`
