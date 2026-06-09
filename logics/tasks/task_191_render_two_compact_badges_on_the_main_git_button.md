## task_191_render_two_compact_badges_on_the_main_git_button - Render two compact badges on the main Git button
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
- [x] The main Git button can show the unpushed commits badge and uncommitted files badge together.
- [x] Badges are compact and do not obscure the existing button label/icon.
- [x] Hidden badges do not reserve awkward empty space.
- [x] Validation passes.

# Backlog
- `item_386_render_git_notification_badges_in_the_ui`


```mermaid
%% logics-kind: task
%% logics-signature: task|render-two-compact-badges-on-the-main-gi|item-386-render-git-notification-badges-|1-confirm-scope|add-or-update-component-tests-or
flowchart TD
    Backlog[Backlog item] --> Build[Implementation]
    Build --> Validate[Validation]
    Validate --> Close[Finish workflow]
```

# Acceptance criteria
- AC1: The main Git button shows both badges when both visible states are true.
- AC2: The main Git button shows only the relevant badge when one visible state is true.
- AC3: The layout remains stable across supported viewport sizes.

# Validation
- Add or update component tests or visual smoke coverage for the main Git button.
- Run `python3 -m logics_manager lint --require-status`.
- Run the relevant frontend tests.
- pytest passed: python3 -m pytest tests/python/test_logics_manager_cli.py -k viewer_git_status_payload. vitest passed: npm test -- tests/viewer.browser-host.test.ts. compile passed: npm run compile.
- Finish workflow executed on 2026-06-09.
- Linked backlog/request close verification passed.

# Report
- Implementation pending.
- Finished on 2026-06-09.
- Linked backlog item(s): `item_386_render_git_notification_badges_in_the_ui`
- Related request(s): `req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes`

# AI Context
- Summary: Render compact dual badges on the main Git button.
- Keywords: git button, badge, ui, compact layout
- Use when: Implementing main Git button badge UI.
- Skip when: Work is only about History or changes surface badges.

# Links
- Request: `req_220_add_git_notification_badges_for_unpushed_commits_and_uncommitted_changes`
- Backlog: `item_386_render_git_notification_badges_in_the_ui`

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
