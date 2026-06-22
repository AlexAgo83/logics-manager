## task_274_orchestrate_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups - Orchestrate the recent activity and corpus reader viewer UX follow-ups
> From version: 2.12.8
> Schema version: 1.0
> Status: In progress
> Understanding: 95
> Confidence: 92
> Progress: 100%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Execute the three viewer UX follow-ups from req_277 / item_495.

# Plan
- [x] 1. Preserve the Recent activity scroll position across re-renders (renderActivityPanel).
- [x] 2. Add the "Corpus changes" filter toggle (main-app state + webviewChrome wiring + HTML).
- [x] 3. Show the object name + corpus-type pill in the document reader header; move the path to the eyebrow.
- [x] 4. Rebuild/sync viewer-host bundle, webview media, and packaged media mirror; run lint and full vitest.
- [x] GATE: do not close until the relevant automated tests and quality checks have been run successfully.

# Backlog
- `item_495_deliver_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups`

# Definition of Done (DoD)
- [x] Code is implemented and reviewed.
- [x] Validation passes.
- [x] Linked docs are synchronized.

# AC Traceability
- request-AC1 -> This task. Proof: implementation delivers the bounded request need.
- request-AC2 -> This task. Proof: implementation scope is limited to the linked delivery slice.
- request-AC3 -> This task. Proof: implementation is executable from the promoted backlog item.
- backlog-AC1 -> This task. Proof: task remains bounded to the linked backlog scope.
- backlog-AC2 -> This task. Proof: task provides the executable implementation surface.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run the task-specific automated tests.

# Report
- All three follow-ups implemented and committed step by step:
  1. Scroll preservation in renderActivityPanel (capture/restore list scrollTop).
  2. "Corpus changes" toggle (activityShowCorpus) wired through main-app + webviewChrome + filter HTML.
  3. setDocument renders the object name + colour-coded corpus-type pill, path moved to the eyebrow (revived from a dead display:none).
- Validation: full vitest 686 green; lint OK; viewer-host bundle, webview media, and viewer assets in sync. Packaged webviewChrome.js mirror re-synced (was drifted).

# AI Context
- Summary: Implement orchestrate the recent activity and corpus reader viewer ux follow-ups.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_277_recent_activity_and_corpus_reader_viewer_ux_follow_ups`
- Backlog: `item_495_deliver_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
