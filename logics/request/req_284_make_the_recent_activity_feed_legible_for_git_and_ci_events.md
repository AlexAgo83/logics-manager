## req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events - Make the Recent Activity feed legible for git and CI events
> From version: 2.14.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer UX
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Git and CI entries in the Recent Activity feed are visually distinguishable from document entries and from each other at a glance, instead of sharing the same letter-pill-plus-two-lines template as everything else.
- A CI run's outcome (success / failure / running / unknown) is readable from the entry without opening anything, because that state is already carried on the event but currently rendered identically regardless of outcome.
- Git and CI lines read as human summaries (what ran, on which branch/commit, how long ago) rather than raw concatenated strings.

# Context
- renderActivityPanel renders every entry the same way: a single-letter marker pill (G for git, C for CI) plus a title and a meta line.
- toolbar.css has per-stage marker tints and one git tint (data-activity-kind="git"), but no CI rule at all, so CI markers fall back to the default grey badge and a failed run looks identical to a passing one.
- ciActivityEvents already has run.badgeState (success/failure/running/unknown) and run.workflowName; activityEventsFromStoredState has the git action and message; none of the state detail reaches the marker dataset, so the renderer cannot colour or glyph by it.
- formatActivityTimeBucket already produces relative 'Nm ago' / 'Nh ago' strings and is reused for the group headers, so no new date code is needed for richer lines.
- logics_manager/viewer_assets/media is a SHA-verified generated copy produced by scripts/dev/sync-webview-media.mjs; shared-web is the only source edited and the sync keeps the shipped artifact byte-stable.
- The viewer also runs over LAN without VSCode codicons, so iconography must use plain unicode glyphs, not the codicon font.

# Acceptance criteria
- AC1: CI activity markers are coloured by run state — success green, failure red, running amber, unknown grey — driven by a badge-state value propagated from the event onto the marker dataset.
- AC2: Git and CI markers use distinct unicode glyphs (a branch glyph for git, a check/cross/dot for CI by state) instead of the bare letters G/C, with the accessible label and tooltip still naming the kind and id.
- AC3: Each git/CI entry carries a left accent stripe coloured by kind so the operational feed is separable from the document flow without reading the text.
- AC4: Git and CI meta lines are recomposed into human summaries that include a relative timestamp via formatActivityTimeBucket; CI shows workflow plus outcome, git shows the action plus branch and short SHA when available.
- AC5: No new runtime dependency, font, or icon pack is added; only existing unicode, CSS, and the in-repo time helper are used.
- AC6: shared-web remains the only edited source and scripts/dev/sync-webview-media.mjs --check passes, keeping viewer_assets byte-stable.
- AC7: Activity-panel render tests cover the state-coloured CI marker, the kind glyphs, and the recomposed git/CI lines; the full vitest suite passes.
- AC8: logics-manager lint and audit pass on the resulting workflow corpus.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_033_recent_activity_feed_legibility`
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/webviewChrome.js` (renderActivityPanel, builds the marker/title/meta DOM, ~line 224)
- `clients/shared-web/media/webviewSelectors.js` (getActivityEntries maps events to entries, ~line 223)
- `clients/shared-web/media/css/toolbar.css` (.activity-panel__* rules, per-stage marker tints, ~line 425)
- `clients/shared-web/media/toolsPanelLayout.js` (formatActivityTimeBucket returns 'Nm ago'/'Nh ago', ~line 91)
- `clients/viewer/src/browser-host/index.js` (ciActivityEvents and activityEventsFromStoredState build the git/ci events, ~line 648)
- `scripts/dev/sync-webview-media.mjs` (SHA-verified sync clients/shared-web/media -> logics_manager/viewer_assets/media)
- `tests/webview.chrome.test.ts` (existing activity-panel render coverage)

# AI Context
- Summary: Make the Recent Activity feed legible for git and CI events
- Keywords: request-chain-scaffold, make the recent activity feed legible for git and ci events, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make the Recent Activity feed legible for git and CI events.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_516_colour_and_glyph_activity_markers_by_kind_and_ci_state`
- `item_517_recompose_git_and_ci_activity_lines_into_human_summaries`
