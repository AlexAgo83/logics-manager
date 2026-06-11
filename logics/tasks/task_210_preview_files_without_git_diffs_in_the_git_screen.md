## task_210_preview_files_without_git_diffs_in_the_git_screen - Preview files without Git diffs in the Git screen
> From version: 2.7.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_402_preview_files_without_git_diffs_in_the_git_screen`

# Acceptance criteria
- AC1: When a selected Git file row produces no useful diff but the current file is readable text, the detail area renders a bounded read-only file preview instead of only an empty/no-diff message.
- AC2: The detail area labels fallback content as `File preview` or an equivalent explicit mode, keeping it visually and semantically distinct from `Diff preview`.
- AC3: Deleted files, missing files, binary/unsupported files, unsafe paths, and oversized files produce clear bounded messages rather than attempting to render misleading content.
- AC4: Existing diff behavior remains unchanged when a real diff is available, including staged versus worktree diff mode.
- AC5: File preview fallback works from the same file-oriented Git subviews that can select files: Changes, Staged, Worktree, and Untracked.
- AC6: The backend endpoint or payload used for fallback remains read-only, path-safe, and size-bounded.
- AC7: Tests cover at least one no-diff readable-file fallback, one unsupported/missing fallback, and the existing diff-first behavior.

# Implementation plan
- Add a read-only file preview payload path in `logics_manager/viewer.py` that shares Git path normalization and rejects unsafe paths.
- Keep `git_diff_payload` as the first choice; only use file preview fallback when the diff endpoint succeeds with no content or a known no-diff state.
- Bound file preview by byte/character limit and detect unsupported binary content before rendering.
- Update `clients/viewer/browser-host.js` and `logics_manager/viewer_assets/viewer/browser-host.js` so the detail panel switches label/meta between `Diff preview` and `File preview`.
- Preserve selected-file behavior across Changes, Staged, Worktree, and Untracked subviews.
- Add Python tests for safe path, missing/deleted/binary/oversized fallback payloads.
- Add browser-host tests for diff-first rendering, readable fallback rendering, and unsupported fallback messages.

# Validation
- Run `python3 -m pytest tests/python/test_logics_manager_cli.py -q -k "git_diff or git_status or file_preview"`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_210_preview_files_without_git_diffs_in_the_git_screen.md` after implementation.

# Report
- Implementation complete.
- Added a read-only `/api/git-file-preview` fallback with shared path safety, text/binary/size handling, and bounded preview content.
- Updated the Git detail panel to keep diff rendering first and switch explicitly to `File preview` only when the diff payload is empty.
- Validation: `python3 -m pytest tests/python/test_logics_manager_cli.py -q -k "git_diff or git_status or file_preview"`, `npx vitest run tests/viewer.browser-host.test.ts`, and `python3 -m logics_manager lint --require-status`.

# AI Context
- Summary: Implement read-only file preview fallback for selected Git rows that do not have useful diff content.
- Keywords: git cockpit, file preview fallback, no diff, untracked file, read-only viewer, path safety
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_236_preview_files_without_git_diffs_in_the_git_screen`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: planned task acceptance criterion covers: When a selected Git file row produces no useful diff but the current file is readable text, the detail area renders a bounded read-only file preview instead of only an empty/no-diff message.
- request-AC2 -> This task. Proof: planned task acceptance criterion covers: The detail area labels fallback content as `File preview` or an equivalent explicit mode, keeping it visually and semantically distinct from `Diff preview`.
- request-AC3 -> This task. Proof: planned task acceptance criterion covers: Deleted files, missing files, binary/unsupported files, unsafe paths, and oversized files produce clear bounded messages rather than attempting to render misleading content.
- request-AC4 -> This task. Proof: planned task acceptance criterion covers: Existing diff behavior remains unchanged when a real diff is available, including staged versus worktree diff mode.
- request-AC5 -> This task. Proof: planned task acceptance criterion covers: File preview fallback works from the same file-oriented Git subviews that can select files: Changes, Staged, Worktree, and Untracked.
- request-AC6 -> This task. Proof: planned task acceptance criterion covers: The backend endpoint or payload used for fallback remains read-only, path-safe, and size-bounded.
- request-AC7 -> This task. Proof: planned task acceptance criterion covers: Tests cover at least one no-diff readable-file fallback, one unsupported/missing fallback, and the existing diff-first behavior.
