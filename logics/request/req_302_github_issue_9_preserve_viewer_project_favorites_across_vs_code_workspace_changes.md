## req_302_github_issue_9_preserve_viewer_project_favorites_across_vs_code_workspace_changes - GitHub issue #9: Preserve viewer project favorites across VS Code workspace changes
> From version: 2.19.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: GitHub issue intake
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Preserve viewer project favorites across VS Code workspace changes

# Context
- Untrusted source issue: https://github.com/AlexAgo83/logics-manager/issues/9
- ## Expected behavior

When using the Logics viewer embedded in VS Code, project selections marked as recent or favorite should remain available after VS Code is closed or after the VS Code workspace changes.

## Actual behavior

Switching projects through the Logics project selector works without changing the VS Code workspace. However, the recent-project and favorite-star preferences disappear after closing VS Code or changing the VS Code workspace. The user must configure them again.

## Steps to reproduce

1. Open Logics in the VS Code viewer.
2. Use the Logics project selector to switch to another project without changing the VS Code workspace.
3. Mark one or more projects as favorites or rely on the recent-project list.
4. Close VS Code, or switch the VS Code workspace.
5. Reopen the viewer and inspect the project selector.

## Impact

Users who work across several projects lose their navigation setup and must repeatedly rebuild their favorites and recent-project shortcuts.

## Suggested acceptance criteria

- Favorites persist independently of the current VS Code workspace.
- Recent projects persist across VS Code restarts and workspace changes.
- Stale or inaccessible projects fail gracefully without clearing valid saved preferences.

# Acceptance criteria
- AC1: The issue is triaged into a bounded Logics workflow before implementation.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`
- `logics_manager/assist.py`
- `tests/python/test_logics_manager_cli.py`

# AI Context
- Summary: Draft a bounded request for github issue #9: preserve viewer project favorites across vs code workspace changes.
- Keywords: request-draft, logics-manager, python runtime, bundled CLI
- Use when: You need a new bounded request doc for the Logics workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- none

# Provenance
- Origin: `github`
- Actor: `AlexAgo83`
- External id: `#9`
- External issue: https://github.com/AlexAgo83/logics-manager/issues/9
- Approval: required before implementation starts.
