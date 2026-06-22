## req_277_recent_activity_and_corpus_reader_viewer_ux_follow_ups - Recent activity and corpus reader viewer UX follow-ups
> From version: 2.12.8
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Three operator-reported viewer follow-ups, captured after delivering the CI activity feed (req_274) and the git/CI activity filter (req_275):
  1. The Recent activity feed snapped back to the top on every auto-refresh, making it impossible to read older entries while the viewer polled.
  2. The git/CI activity filter governs only event entries; logics-doc (corpus) changes were always shown with no way to hide them. The operator wants a "Corpus changes" toggle so the feed can be shown in full or reduced to events only.
  3. On the corpus-object reading screens, the header title showed the raw file path. The operator wants the object's name instead, with a type pill in front indicating which corpus doc type it is.

# Context
- Recent activity renders via renderActivityPanel in clients/shared-web/media/webviewChrome.js; the feed list is rebuilt from scratch on each data dispatch, which reset scrollTop.
- The git/CI filter state lives in clients/shared-web/src/main-app/index.js (activityShowGit/activityShowCi) and is wired into the chrome via getter/setter options; a third corpus toggle follows the same pattern. Per req_275 the corpus class was intentionally always shown — this request revisits that decision at operator request.
- The browser viewer document header is rendered by setDocument in clients/viewer/src/browser-host/index.js; corpus docs previously passed the file path as the title text. item.title (object name) and item.stage (corpus type) are already available on the focused item.
- The packaged pip viewer serves viewer_assets/media/* verbatim; webviewChrome.js had drifted behind canonical and was re-synced as part of this work.

# Acceptance criteria
- AC1: The Recent activity feed preserves its scroll position across re-renders (auto-refresh, filter toggles, "show next") instead of snapping to the top.
- AC2: A "Corpus changes" toggle (default on) is added to the activity filter popover; unchecking it hides logics-doc entries while leaving git/CI toggles independent, and the filter button shows its non-default active indicator when any toggle is off.
- AC3: On corpus-object reading screens the header shows the object name with a colour-coded corpus-type pill (Request/Backlog/Task/Product/Architecture/Spec) in front; the file path moves to the eyebrow subtitle.
- AC4: vitest covers the scroll-preservation, the corpus toggle filter logic, and the object-name + pill header rendering.
- AC5: logics-manager lint and audit pass, and the built/packaged viewer assets stay in sync with canonical sources.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/webviewChrome.js` (renderActivityPanel scroll + corpus filter)
- `clients/shared-web/src/main-app/index.js` (activityShowCorpus state)
- `clients/viewer/index.html` (corpus filter checkbox, document badge markup)
- `clients/viewer/src/browser-host/index.js` (setDocument object name + type pill)
- `clients/viewer/viewer.css` (badge + eyebrow styles)
- `tests/webview.chrome.test.ts`, `tests/viewer.browser-host.test.ts`

# AI Context
- Summary: Recent activity scroll preservation, a corpus-changes filter toggle, and an object-name + type-pill document header.
- Keywords: viewer, recent-activity, activity-filter, corpus-reader, document-header
- Use when: Polishing the Recent activity feed or the corpus reading screens in the viewer.
- Skip when: The change is server-side or unrelated to the viewer activity/reader surfaces.

# Report
- All three follow-ups implemented and covered by vitest (686 tests green). Lint passes; viewer-host bundle, webview media, and viewer assets verified in sync.
- Commits: scroll fix (preserve Recent activity scroll), corpus filter (Corpus changes toggle), document header (object name + corpus-type pill), and the packaged webviewChrome.js mirror sync.

# Backlog
- `item_495_deliver_the_recent_activity_and_corpus_reader_viewer_ux_follow_ups`
