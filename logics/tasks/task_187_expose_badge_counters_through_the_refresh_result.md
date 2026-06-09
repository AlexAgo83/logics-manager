## task_187_expose_badge_counters_through_the_refresh_result - Expose badge counters through the refresh result
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
- [x] Refresh exposes both badge counters in a stable data contract.
- [x] The UI can consume the counters without issuing separate Git commands.
- [x] Errors or unavailable counts are represented consistently with existing refresh payload patterns.
- [x] Validation passes.

# Backlog
- `item_384_compute_git_badge_counters_on_refresh`


```mermaid
%% logics-kind: task
%% logics-signature: task|expose-badge-counters-through-the-refres|item-384-compute-git-badge-counters-on-r|1-confirm-scope|add-or-update-tests-covering-the
flowchart TD
    Backlog[Backlog item] --> Build[Implementation]
    Build --> Validate[Validation]
    Validate --> Close[Finish workflow]
```

# Acceptance criteria
- AC1: The refresh result includes `unpushedCommits` and `uncommittedFiles` or equivalent clearly named fields.
- AC2: Zero counts are represented explicitly so UI badge visibility can be derived safely.
- AC3: The contract is documented through tests or typed interfaces where the codebase already uses them.

# Validation
- Add or update tests covering the refresh payload shape.
- Run `python3 -m logics_manager lint --require-status`.
- Run the relevant refresh/API tests.
- pytest passed: python3 -m pytest tests/python/test_logics_manager_cli.py -k viewer_git_status_payload. vitest passed: npm test -- tests/viewer.browser-host.test.ts. compile passed: npm run compile.
- Finish workflow executed on 2026-06-09.
- Linked backlog/request close verification passed.

# Report
- Implementation pending.
- Finished on 2026-06-09.
- Linked backlog item(s): `item_384_compute_git_badge_counters_on_refresh`
- Related request(s): `req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes`

# AI Context
- Summary: Expose Git badge counters through the refresh state consumed by the UI.
- Keywords: git, refresh payload, badge counters, api contract
- Use when: Wiring computed Git counters into refresh output.
- Skip when: Work is only about visual styling.

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
