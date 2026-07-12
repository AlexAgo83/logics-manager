## item_538_add_clickable_git_history_commit_diffs - Add clickable Git history commit diffs
> From version: 2.17.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer Git history
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The Git History tab lists recent commits but the rows are static, while the Changes tab already supports click-to-preview diffs in the right-hand pane.
- Operators must leave the viewer or run Git manually to inspect what a recent commit changed, even though local Git data and the diff renderer are already available.

# Scope
- In:
  - Render each recent History commit as a clickable control with a stable `data-viewer-git-commit` attribute carrying the displayed short hash.
  - Keep the History domain's detail pane visible and change the empty detail message to `Select a commit to preview its diff.`.
  - Add a `loadGitCommitDiff(ref, button)` frontend helper that marks the selected commit row active, fetches `/api/git-commit-diff`, and renders the returned patch through `renderGitDiffPreview`.
  - Add a backend `git_commit_diff_payload(repo_root, ref, ...)` that validates Git availability/worktree state, accepts only a safe hex ref, runs a read-only `git show --no-ext-diff --format=medium --stat --patch --find-renames --unified=80 <ref>`, caps output, and returns a structured payload.
  - Expose `/api/git-commit-diff?ref=<hash>` in the viewer request handler, returning the same `{ok,payload}` envelope as `/api/git-diff`.
  - Prefer validating the requested ref against currently displayed `recentCommits` in the client before fetching; backend still validates format and Git errors independently.
  - Add CSS only if needed to make active commit rows visually consistent with active file rows; reuse existing classes where they already work.
- Out:
  - Selecting individual files inside a commit diff.
  - Loading arbitrary refs not present in the displayed History list, except for backend format validation coverage.
  - Remote commit links, compare links, or provider-specific behavior.
  - Any Git mutation action.

# Acceptance criteria
- AC1: In the History tab, clicking a commit row fetches `/api/git-commit-diff?ref=<hash>` and renders a diff in the existing right-hand pane.
- AC2: The History domain keeps `viewer-git__workspace` in `has-diff-detail` mode; the detail pane is hidden only for domains that genuinely have no detail view.
- AC3: The commit diff output uses the existing diff line classes for additions, deletions, hunk headers, and metadata.
- AC4: Invalid refs and Git failures render a concise message in the detail pane without changing tabs or throwing uncaught errors.
- AC5: The existing first changed-file auto-preview still runs for Changes/Staged/Worktree, but does not override a user's selected History commit while preserving the Git screen.
- AC6: A backend pytest covers success, unsafe ref rejection, non-repository/missing Git behavior, and max-char truncation.
- AC7: A browser-host vitest covers History click-to-preview and confirms the existing History reveal button still works.
- AC8: Generated viewer bundle is up to date and TypeScript checks pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: In the History tab, clicking a commit row fetches `/api/git-commit-diff?ref=<hash>` and renders a diff in the existing right-hand pane.
- request-AC2 -> This backlog slice. Proof: AC2: The History domain keeps `viewer-git__workspace` in `has-diff-detail` mode; the detail pane is hidden only for domains that genuinely have no detail view.
- request-AC3 -> This backlog slice. Proof: AC3: The commit diff output uses the existing diff line classes for additions, deletions, hunk headers, and metadata.
- request-AC4 -> This backlog slice. Proof: AC4: Invalid refs and Git failures render a concise message in the detail pane without changing tabs or throwing uncaught errors.
- request-AC5 -> This backlog slice. Proof: AC5: The existing first changed-file auto-preview still runs for Changes/Staged/Worktree, but does not override a user's selected History commit while preserving the Git screen.
- request-AC6 -> This backlog slice. Proof: AC6: A backend pytest covers success, unsafe ref rejection, non-repository/missing Git behavior, and max-char truncation.
- request-AC7 -> This backlog slice. Proof: AC7: A browser-host vitest covers History click-to-preview and confirms the existing History reveal button still works.
- request-AC8 -> This backlog slice. Proof: AC8: Generated viewer bundle is up to date and TypeScript checks pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_039_git_history_commit_diff_preview`
- Architecture decision(s): (none yet)
- Request: `req_291_preview_commit_diffs_from_git_history`
- Primary task(s): `task_288_orchestrate_git_history_commit_diff_previews`

# AI Context
- Summary: Add clickable Git history commit diffs
- Keywords: scaffolded-backlog, add clickable git history commit diffs, implementation-ready
- Use when: Implementing the scaffolded slice for Add clickable Git history commit diffs.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
