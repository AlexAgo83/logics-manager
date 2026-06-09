## task_185_count_local_commits_not_pushed_to_upstream - Count local commits not pushed to upstream
> From version: 2.4.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Git workflow visibility
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The refresh path can count commits in `HEAD` that are absent from the configured upstream.
- [x] Missing upstream configuration is handled without a blocking refresh failure.
- [x] The implementation follows existing Git helper/error patterns.
- [x] Validation passes.

# Backlog
- `item_384_compute_git_badge_counters_on_refresh`


```mermaid
%% logics-kind: task
%% logics-signature: task|count-local-commits-not-pushed-to-upstre|item-384-compute-git-badge-counters-on-r|1-confirm-scope|add-or-update-focused-tests-for
flowchart TD
    Backlog[Backlog item] --> Build[Implementation]
    Build --> Validate[Validation]
    Validate --> Close[Finish workflow]
```

# Acceptance criteria
- AC1: With an upstream configured, the count matches the equivalent of `git rev-list --count @{u}..HEAD`.
- AC2: With no upstream configured, refresh continues and the badge data is safe to consume.
- AC3: The count is branch-aware and uses the current checked-out branch.

# Validation
- Add or update focused tests for upstream-present and upstream-missing cases.
- Run `python3 -m logics_manager lint --require-status`.
- Run the relevant Git refresh test suite.
- pytest passed: python3 -m pytest tests/python/test_logics_manager_cli.py -k viewer_git_status_payload. vitest passed: npm test -- tests/viewer.browser-host.test.ts. compile passed: npm run compile.
- Finish workflow executed on 2026-06-09.
- Linked backlog/request close verification passed.

# Report
- Implementation pending.
- Finished on 2026-06-09.
- Linked backlog item(s): `item_384_compute_git_badge_counters_on_refresh`
- Related request(s): `req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes`

# AI Context
- Summary: Count local commits not pushed to upstream for Git badge data.
- Keywords: git, upstream, unpushed commits, refresh
- Use when: Implementing the unpushed commit counter.
- Skip when: Work is only about UI badge rendering.

# Links
- Request: `req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes`
- Backlog: `item_384_compute_git_badge_counters_on_refresh`

# AC Traceability
- request-AC1 -> This task. Proof: After refresh, the main Git button can show a badge with the count of local commits not pushed to the configured upstream branch.
- request-AC2 -> This task. Proof: After refresh, the main Git button can show a second badge with the count of modified/uncommitted files.
- request-AC3 -> This task. Proof: Each badge is hidden when its count is zero.
- request-AC4 -> This task. Proof: Opening the Git window marks badges on the main Git button as seen and hides them there without implying the Git state is resolved.
- request-AC5 -> This task. Proof: The unpushed commits badge remains visible on the Git History control until History is opened.
- request-AC6 -> This task. Proof: The uncommitted files badge remains visible on the relevant changes surface/control, when one exists, until that surface is opened.
- request-AC7 -> This task. Proof: A subsequent refresh can show the badges again when counts greater than zero are detected.
- request-AC8 -> This task. Proof: Each badge has its own color, compact placement, and a hover tooltip explaining the count.
- request-AC9 -> This task. Proof: Missing upstream configuration, unavailable Git, or Git command failures are handled without blocking the rest of the refresh.
