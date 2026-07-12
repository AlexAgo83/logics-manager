## req_291_preview_commit_diffs_from_git_history - Preview commit diffs from Git history
> From version: 2.17.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer Git history
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The Git History tab should let a user click a commit and preview that commit's diff in the same right-hand detail pane used by Changes.
- The implementation should reuse the existing diff rendering and Git screen layout rather than adding a separate history-diff screen or dependency.
- Commit diff loading must stay read-only, path-safe where paths are involved, bounded, and unavailable gracefully when Git is missing or the project is not a repository.

# Context
- The Git screen already has a two-column `viewer-git__workspace has-diff-detail` layout with `data-viewer-git-detail` and `data-viewer-git-diff` for file diffs.
- `renderGitStatus` currently renders History rows as static `<li>` entries and `applyGitDomain('history')` hides the detail pane, so there is no clickable target for commit diffs.
- `git_status_payload` already fetches and returns a bounded `recentCommits` array with short hashes, subject, author, date, and refs. That payload is enough to render click targets and to validate requested commits against the visible history.
- `git_diff_payload` is the backend pattern to copy: verify Git availability, confirm the folder is inside a worktree, run a read-only Git command with `--no-ext-diff`, cap output, and return `{state,message,...}` instead of throwing.
- The UI should support both GitHub and GitLab repositories because the feature reads local Git history only; remote provider is irrelevant.

# Acceptance criteria
- AC1: Each visible History commit row is rendered as an accessible button or equivalent clickable control with the commit hash, subject, author/date, and refs preserved.
- AC2: Clicking a History commit keeps the History panel active and shows that commit's diff in the existing `viewer-git__detail` pane, using the same diff styling as Changes.
- AC3: The initial History detail copy reads `Select a commit to preview its diff.` and the detail pane is not hidden while the History domain is active.
- AC4: A read-only backend payload function and `/api/git-commit-diff?ref=<hash>` endpoint return a bounded diff for a displayed commit via Git without adding a dependency or mutation path.
- AC5: Invalid refs, missing Git, non-repository folders, Git command failures, and oversized diffs return clear payload states/messages and do not break the Git screen.
- AC6: Existing Changes diff behavior, auto-selection of the first changed file, History reveal paging, and Git badge counts continue to work.
- AC7: Tests cover the backend commit-diff payload, the endpoint route, the History click-to-preview behavior, and the unchanged fallback behavior for empty/unavailable history.
- AC8: `npm run bundle:viewer-host`, `npm run check:viewer-host`, targeted vitest/pytest checks, `npm run lint:ts`, and `logics-manager lint --require-status` pass.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_039_git_history_commit_diff_preview`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/src/browser-host/index.js` (`renderGitStatus`, `loadGitDiff`, and the Git click handler already render working-tree diffs in the shared detail pane)
- `clients/viewer/src/browser-host/util.js` (`applyGitDomain` currently hides the diff detail when the History domain is active)
- `logics_manager/viewer.py` (`git_status_payload` already returns bounded `recentCommits`; `git_diff_payload` provides the safe read-only diff pattern)
- `tests/viewer.browser-host.test.ts` (Git screen coverage already asserts Changes diffs, History rows, and reveal paging)
- `tests/python/test_viewer_cli.py` (backend coverage for Git status and bounded diff payloads)

# AI Context
- Summary: Preview commit diffs from Git history
- Keywords: request-chain-scaffold, preview commit diffs from git history, development-ready
- Use when: You need to implement or review the scaffolded workflow for Preview commit diffs from Git history.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_538_add_clickable_git_history_commit_diffs`
