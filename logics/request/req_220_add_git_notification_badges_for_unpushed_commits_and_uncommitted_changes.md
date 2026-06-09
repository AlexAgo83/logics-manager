## req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes - Add Git notification badges for unpushed commits and uncommitted changes
> From version: 2.4.0
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Git workflow visibility
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Show compact Git notification badges after each refresh so the operator can immediately see local commits that are not pushed and modified files that are not committed.
- Keep the badges as "new information seen/unseen" indicators, while preserving the real Git state inside the Git screen even after a badge is dismissed.

# Context
- The main Git entry point currently requires opening the Git screen to inspect local repository state.
- The requested counters are:
  - local commits present on the current branch but absent from its upstream branch;
  - files with uncommitted changes, using the same semantics as the existing Git status surface.
- Badges should be visible only when the corresponding count is greater than zero.
- Opening the Git window marks main Git button badges as seen.
- Opening the History sub-screen marks the unpushed commits badge on History as seen.
- Opening the local changes surface, when such a surface exists, marks the uncommitted files badge there as seen.
- A later refresh can show the badges again when the counters still report values greater than zero.

```mermaid
%% logics-kind: request
%% logics-signature: request|add-git-notification-badges-for-unpushed|show-compact-git-notification-badges-aft|ac1-after-refresh-the-main-git
flowchart TD
    Refresh[Refresh] --> Counters[Git counters]
    Counters --> NotificationState[Seen/unseen badge state]
    NotificationState --> GitButton[Main Git button]
    NotificationState --> GitViews[Git subviews]
```

# Acceptance criteria
- AC1: After refresh, the main Git button can show a badge with the count of local commits not pushed to the configured upstream branch.
- AC2: After refresh, the main Git button can show a second badge with the count of modified/uncommitted files.
- AC3: Each badge is hidden when its count is zero.
- AC4: Opening the Git window marks badges on the main Git button as seen and hides them there without implying the Git state is resolved.
- AC5: The unpushed commits badge remains visible on the Git History control until History is opened.
- AC6: The uncommitted files badge remains visible on the relevant changes surface/control, when one exists, until that surface is opened.
- AC7: A subsequent refresh can show the badges again when counts greater than zero are detected.
- AC8: Each badge has its own color, compact placement, and a hover tooltip explaining the count.
- AC9: Missing upstream configuration, unavailable Git, or Git command failures are handled without blocking the rest of the refresh.

# Scope
- In:
  - compute Git badge counters during refresh;
  - maintain seen/unseen notification state for the main Git button and relevant Git subviews;
  - render compact colored badges and tooltips in the existing UI.
- Out:
  - changing the underlying Git history/status features beyond the data needed for the badges;
  - adding push/commit actions;
  - treating badge dismissal as resolving Git changes.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Dependencies and risks
- Depends on the existing refresh pipeline and Git status/history surfaces.
- The unpushed commit count requires an upstream branch; no upstream must degrade gracefully.
- The uncommitted file count must match the existing app's interpretation of status, including whether untracked files are included.
- Badge visibility must not mislead the operator into thinking local changes were committed or pushed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- Existing Git refresh implementation and Git screen controls.
- `git rev-list --count @{u}..HEAD` as the intended baseline for unpushed local commits when upstream exists.
- Existing Git status parsing for modified/uncommitted file counts.

# AI Context
- Summary: Add Git notification badges for local unpushed commits and modified/uncommitted files, with seen/unseen behavior across the main Git entry point and Git subviews.
- Keywords: git, notification badge, unpushed commits, uncommitted files, refresh, history, tooltip
- Use when: Implementing or reviewing Git state visibility in the viewer UI.
- Skip when: The change is unrelated to Git refresh state or Git screen notifications.

# Backlog
- `item_384_compute_git_badge_counters_on_refresh`
- `item_385_track_git_badge_visibility_and_viewed_state`
- `item_386_render_git_notification_badges_in_the_ui`
