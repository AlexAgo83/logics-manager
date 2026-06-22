## item_495_deliver_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups - Deliver the recent activity and corpus reader viewer UX follow-ups
> From version: 2.12.8
> Schema version: 1.0
> Status: In progress
> Understanding: 95
> Confidence: 92
> Progress: 100%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer needs three operator-reported polish fixes on the Recent activity feed and the corpus reading screens (see req_277): scroll reset on refresh, no way to hide corpus changes, and a file-path title instead of the object name.

# Scope
- In:
  - Preserve the Recent activity scroll position across re-renders.
  - Add a "Corpus changes" filter toggle alongside the git/CI toggles.
  - Show the object name with a corpus-type pill in the document reader header; move the path to the eyebrow.
- Out:
  - Server-side payload changes; the git/CI event mapping (req_274/req_275).

# Acceptance criteria
- AC1: Recent activity preserves scroll position across re-renders.
- AC2: A default-on "Corpus changes" toggle hides logics-doc entries when unchecked, independent of git/CI toggles.
- AC3: Corpus reader header shows the object name + colour-coded type pill, with the path in the eyebrow.
- AC4: vitest covers all three behaviours.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: scrollTop captured and restored in renderActivityPanel; tests/webview.chrome.test.ts "preserves the activity feed scroll position".
- request-AC2 -> This backlog slice. Proof: activityShowCorpus toggle wired through main-app + webviewChrome; tests/webview.chrome.test.ts "hides corpus document entries".
- request-AC3 -> This backlog slice. Proof: setDocument renders object name + stage pill; tests/viewer.browser-host.test.ts "opens read preview".
- request-AC4 -> This backlog slice. Proof: vitest suites above (686 tests green).
- request-AC5 -> This backlog slice. Proof: lint OK; viewer-host/webview-media/viewer-assets in sync.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_277_recent_activity_and_corpus_reader_viewer_ux_follow_ups`
- Primary task(s): `task_274_orchestrate_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups`

# AI Context
- Summary: Deliver the recent activity and corpus reader viewer UX follow-ups
- Keywords: backlog, promote, slice, deliver the recent activity and corpus reader viewer ux follow-ups
- Use when: You need a bounded backlog item for Deliver the recent activity and corpus reader viewer UX follow-ups.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.
