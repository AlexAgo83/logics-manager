## item_857_expose_review_bursts_from_local_git - Expose review bursts from local Git
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 92%
> Confidence: 88%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 17:34:02

# AI Context
- Summary: Shapes existing local Git status and history into Review bursts, then adds the missing committed-file diff payload.
- Keywords: expose, review, bursts, local, git
- Use when: implementing backend data for the Review timeline or testing Git burst/file-diff edge cases.
- Skip when: working only on Review layout, keyboard behavior, or CSS after the payload contract already exists.

# Problem
- The viewer can list working-tree files and recent commits, but Review needs one shaped payload: bursts over time, each with the files changed inside it.
- The existing commit diff endpoint returns a whole patch, which is enough for the Git History pane but too coarse for vertical per-file navigation inside Review.

# Scope
- In:
  - Add a bounded, read-only review payload that normalizes the dirty working tree and recent commits into ordered bursts.
  - Represent the working tree as a synthetic burst when there are uncommitted changes, reusing the existing status groups and line counts.
  - Represent each recent commit as a burst with commit hash, subject, author/date, refs, and a per-file change list from Git name-status/numstat output.
  - Add a committed-file diff payload that accepts a safe commit ref and safe repo-relative path, runs read-only Git with `--no-ext-diff`, caps output, and returns the same state/message style as existing Git payloads.
  - Reuse existing path normalization, Git availability checks, worktree checks, timeout scaling, and truncation conventions where possible, and register the route in the `logics_manager/viewer.py` route table beside `/api/git-status` and `/api/git-commit-diff`.
  - Return concise unavailable, non-repository, error, empty, and truncation states for the Review screen.
- Out:
  - Persisting review bursts outside Git.
  - Grouping file changes by Codex session or by wall-clock save batches.
  - Loading arbitrary refs not present in the bounded Review timeline except where backend validation requires defensive behavior.
  - Any Git mutation endpoint.

# Acceptance criteria
- AC2: The payload orders `Uncommitted changes` before recent commits when dirty and omits it when clean.
- AC3: Each burst includes a bounded file list with path, change kind, and additions/deletions when Git reports numeric stats.
- AC5: A committed-file diff endpoint returns the selected file diff for a selected commit, bounded and rendered from a structured payload.
- AC7: Missing Git, non-repository roots, invalid refs, unsafe paths, Git errors, empty histories, and oversized diffs return structured states/messages.
- AC8: Review uses the existing Git refresh data or one bounded read-only endpoint, not a new polling or persistence mechanism.
- AC11: Python tests cover burst construction and committed-file diff success/failure cases.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The payload orders `Uncommitted changes` before recent commits when dirty and omits it when clean.
- request-AC3 -> This backlog slice. Proof: AC3: Each burst includes a bounded file list with path, change kind, and additions/deletions when Git reports numeric stats.
- request-AC5 -> This backlog slice. Proof: AC5: A committed-file diff endpoint returns the selected file diff for a selected commit, bounded and rendered from a structured payload.
- request-AC7 -> This backlog slice. Proof: AC7: Missing Git, non-repository roots, invalid refs, unsafe paths, Git errors, empty histories, and oversized diffs return structured states/messages.
- request-AC8 -> This backlog slice. Proof: AC8: Review uses the existing Git refresh data or one bounded read-only endpoint, not a new polling or persistence mechanism.
- request-AC11 -> This backlog slice. Proof: AC11: Python tests cover burst construction and committed-file diff success/failure cases.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)
- Request: `req_381_add_a_review_slot_for_project_change_timelines`
- Primary task(s): `task_393_orchestrate_the_review_slot_change_timeline`

# Priority
- Priority: High
- Rationale: Review cannot render the requested timeline safely until the backend exposes bursts and per-file commit diffs.
