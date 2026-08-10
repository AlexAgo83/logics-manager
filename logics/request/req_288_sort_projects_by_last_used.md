## req_288_sort_projects_by_last_used - Sort projects by last used
> From version: 2.15.7
> Status: Done
> Schema version: 1.0
> Understanding: 75
> Confidence: 70
> Complexity: Medium
> Theme: Viewer request
> Indicators reviewed: 2026-08-10 09:06:28

# Needs
- In the project list of the viewer, the favorited Logics projects should be sorted by their last usage date, with the most recently used projects displayed first.

The currently active project should always remain in first position, even if another favorited project was used more recently.

# Context
- The sorting should only affect favorited projects in the viewer project list. The active project must always stay pinned at the top, and the sort order should be updated whenever a project is opened or used.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- AC1: The request has been reviewed and clarified enough to triage.
- AC2: Follow-up backlog items preserve the need and relevant context.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit in the linked backlog item.
- [x] Acceptance criteria are testable in the linked backlog/task.
- [x] Dependencies and known risks are listed in the linked backlog/task.

# Backlog
- `item_531_sort_projects_by_last_used`
