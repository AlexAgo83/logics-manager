## task_299_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes - GitHub issue #9: Preserve viewer project favorites across VS Code workspace changes
> From version: 2.19.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-08-04

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_587_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes`

# Acceptance criteria
- AC1: The issue is triaged into a bounded Logics workflow before implementation.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_299_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_299_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes.md` after implementation.

# Validation
- npm run compile and npm run test -- --run tests/logicsHtml.test.ts passed.
- npm run compile and targeted logicsHtml tests passed.
- Finish workflow executed on 2026-08-04.
- Linked backlog/request close verification passed.

# Report
- Moved embedded viewer favorites and recents from workspace-scoped webview state to extension globalState; the webview now hydrates from and reports back to that durable store.
- Finished on 2026-08-04.
- Linked backlog item(s): `item_587_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes`
- Related request(s): `req_302_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes`

# AI Context
- Summary: Implement github issue #9: preserve viewer project favorites across vs code workspace changes.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_302_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: issue #9 was imported into this linked request, backlog item, and task before implementation.
