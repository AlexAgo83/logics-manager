## req_359_viewer_redesign_mockups_gap_review_across_all_screens - Viewer redesign mockups: gap review across all screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: A screen-by-screen review comparing the live viewer against its own approved redesign mockups (logics/external/mockup/*_redesign.html) found that several screens shipped only part of their "Proposed" design — some regressed to pre-redesign visuals, one redesign was never actually deployed to any running server, and two structural/navigation issues span multiple screens at once.
- Keywords: viewer redesign, mockup gap, board card progress, fleet home, workshop, cdx, reader, filters, remote, settings, insights, health, onboarding, fixed width layout, runbooks navigation
- Use when: Scoping fixes to bring a viewer screen back in line with its approved mockup, or deciding which mockup-vs-live gaps are worth closing.
- Skip when: Proposing a *new* redesign — this request is entirely about closing gaps against redesigns already approved and mostly already coded.

# Needs
- As an operator who approved these redesign mockups, I need the live viewer to actually match what was approved, not a partial or regressed version of it.
- As an operator navigating a task/reader screen, Getting Started, or Settings, I need the content to use the available width instead of being capped, so a side panel doesn't end up misplaced (e.g. on the right instead of the left) and a third of the viewport isn't left empty.
- As an operator, I need Runbooks to live under Corpus (not Workshop), and every Corpus screen to carry the same header selection switch the other screens already have.

# Context
- Method: for each logics/external/mockup/*_redesign.html file, drove the live viewer (http://127.0.0.1:65120/, headless Chrome via CDP) through the real navigation path for each screen the mockup covers, then compared the live capture against that mockup's own "Proposed" section (each mockup file already contains a "Current vs Proposed" comparison built from real captures, per `logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md`).
- Several screens have already shipped most or all of their approved redesign — this request is about the remainder, not a wholesale redo. Each finding below names the screen and cites what was actually observed.
- Two issues were reported directly by the operator, not found by the review, and are corroborated by what the review found independently (Getting Started's dead right-hand column matches the operator's "content should use the available space" report exactly):
  1. Several screens cap content to a fixed width instead of letting it use available space (seen on a task/reader screen, Getting Started, and Settings); on a task screen this pushes the side menu to the right instead of the left.
  2. Runbooks should be a Corpus section, not a Workshop one, and Corpus screens should carry the same header selection switch other screens already have.

## Board
- `.card--used` (`clients/shared-web/media/css/board.css:496`, applied by `renderBoardApp.js:1025` to any request already promoted to backlog/task) still applies a full-card yellow wash (`rgba(234, 179, 8, 0.18)`) — the same full-body-tint pattern removed for stage colours today (commit `8d027abd`, see that commit's own comment) was never applied to this rule.
- The progress bar (`.card--progress-bar::after`) is positioned `bottom: 4px` — the very bottom edge of the card, behind/under the item-count-and-date footer row — instead of directly under the title as the mockup (`board_activity_redesign.html`, "Proposed — one mechanism" section) shows it.

## Fleet home
- No server currently reachable on this machine actually serves this repo's redesigned `renderFleetHome()`. The one `--fleet`-capable server running uses the globally-installed npm package and still renders the pre-redesign card-grid overlay (star/name/Open header, Path disclosure, stacked OPEN/ISSUES/STALE tiles). The redesign itself is fully written in `clients/viewer/browser-host.js`/`viewer.css` but has never been visually confirmed live.
- The mockup's two labeled sections ("Favorites" / "All projects") don't exist in the implementation — favorites are only sorted to the top of one continuous row list, with no section heading separating them.

## Workshop / CDX
- Commands: no per-prefix quick-filter chips (view/build/check/test) above the filter field.
- Commands: script grouping is shallow — most of ~51 scripts fall under one generic group instead of being split by their own prefix.
- Commands: no left accent bar per row.
- Commands: the running-script state (accent + elapsed time + Stop button) is unverified — no script was actually launched during the review.
- Explorer: `4 item(s)` still uses the flagged plural-in-parentheses wording when a directory is selected.
- Runbooks: the proposed stale-verified amber accent is unverified — no stale runbook exists in the current corpus to exercise it.
- CDX Missions: top strip shows "Strengths 3 / Corpus actions 0" instead of the mockup's "Selected" (mission name) / "Session" (session + quota) tiles.
- CDX Missions: right panel keeps the old toggle-button shape (`Plan preview`/`Run output` buttons) instead of the proposed always-visible dimmed command preview.
- CDX Missions: the disabled launch button doesn't say why inline (mockup: `Launch — preview first`).
- CDX Missions: `Fix directly` checkbox has no inline consequence text.

## Reader / modal / filters
- Reader: the full slug is still shown as a breadcrumb (`req_357_make_flow_s_traceability_checks…`) instead of the short ref (R357) the mockup proposes.
- Reader: "Linked workflow" renders as a full-width diagram block above the content instead of integrated into the left column beside the table of contents as the mockup shows — may be an intentional, arguably richer alternative; worth a design call rather than an automatic "fix."
- Filters: `Group`/`Sort` are still `<select>` dropdowns, not the segmented control (Type | Status | Theme | None) the mockup proposes.
- Filters: `Clear filters` always renders solid blue instead of dimming to ~50% opacity when nothing is active to clear.
- Already correct, no action needed: new-request modal (close glyph, disabled/enabled button states, live path preview) and the filter panel's "four identical readings" bug are both already fixed.

## Remote / Settings
- Git: diff is still uncoloured (additions/deletions/hunks all one grey).
- Git: diff still hard-truncates ("55 lines", "truncated") with no way to see the rest.
- Git: no per-file diffstat list with change bars, and no way to scope the diff to one file.
- CI: the old State/Branch/Commit/Match tile row still duplicates the new verdict banner.
- CI: jobs aren't sorted slowest-first and have no relative-duration bar.
- Release: the blocking gate is still described three different ways at once (tile `BLOCKED GATE: git_push`, pill `stale`, substate `pushed`).
- Release: gates render as 8 stacked full-width blocks instead of the proposed compact wrap-grid.
- Release: npm_publication's "optional" annotation is missing from the gate list.
- Release: the old State/Version/Blocked-gate/Evidence tile row still duplicates the verdict sentence.
- Settings: "Automatic refresh" is a checkbox+label, not a real toggle switch, and there's no "last refreshed Xs ago" readout.
- Settings: ChatGPT Developer Mode is still a button opening a panel, not an inline toggle showing current state.
- Settings: `Stop viewer` isn't visually distinguished as destructive (no red/danger styling, no confirmation step); it looks identical to `Restart viewer`.
- Settings: `Copy diagnostics` renders as a solid primary button instead of a quiet/secondary one.
- Already correct, no action needed: the new "This viewer" state card, the Insights/Health/Getting-Started buttons moved out of Settings, the single non-duplicated screen title, and the cost-stating restart/stop copy.

## Insights / Health / Onboarding
- Insights: the summary card has no verdict--ok/warn/bad treatment (colored left border, inline primary action button).
- Insights: stat tiles are still large 2×2 blocks instead of the proposed thin horizontal strip.
- Insights: "Flow health" is one flat list, not grouped into "needs a decision" vs. "expected while work is in flight" with the latter dimmed.
- Health: no "Fixable" count anywhere — "Apply fixes…" doesn't say how many or what it will do.
- Health: stat tiles are still 2×2 blocks instead of the proposed thin strip.
- Getting Started: each stage offers only one action button instead of the proposed create+look pair (e.g. "New request" + "Open requests").
- Getting Started: a wide column on the right of the viewport (roughly x≈980–1420 at 1440px) stays empty behind every stage card — the same "a third of the screen unused" defect the mockup called out originally, now recurring alongside the fixed-width issue reported directly by the operator.
- Already correct, no action needed: Insights' "needs attention" arithmetic reconciles, stage-coloured shape bars, Health's verdict-first layout with grouped-by-file findings and the dropped "Release ready" tile, and Getting Started's left TOC with real per-stage document counts and a capped reading width for prose.

# Acceptance criteria
- AC1: Board cards carry no full-card background wash for any state, including a promoted/"used" request; state is conveyed only by the left accent (colour + shape) and the fixed-length progress bar, matching the approved mockup.
- AC2: The board's progress bar renders directly under the card title, not behind the footer row.
- AC3: A `--fleet` launch of this repository's own checkout serves the redesigned Fleet home (row layout, colored+shaped left accent, favorites/all-projects sections) and that has been visually confirmed against a running server, not only read from source.
- AC4: Runbooks appear under the Corpus section of the viewer's navigation, not under Workshop, and every Corpus screen carries the same header selection switch present on other top-level screens.
- AC5: No viewer screen caps its content to a fixed width when the viewport offers more room; a task/reader screen's side panel/menu renders on the left with content filling the remaining width, and Getting Started's stage cards use the full available width instead of leaving a dead column on the right.
- AC6: Each of the per-screen findings listed under Workshop/CDX, Reader/modal/filters, Remote/Settings, and Insights/Health/Onboarding above is either resolved to match its mockup's "Proposed" design, or explicitly deferred with a stated reason (e.g. a state genuinely unreachable in this corpus, or a deliberate design deviation from the mockup).

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- logics/external/mockup/board_activity_redesign.html
- logics/external/mockup/fleet_home_redesign.html
- logics/external/mockup/insights_health_onboarding_redesign.html
- logics/external/mockup/reader_modal_filters_redesign.html
- logics/external/mockup/remote_settings_redesign.html
- logics/external/mockup/workshop_cdx_redesign.html
- clients/shared-web/media/css/board.css
- clients/shared-web/media/renderBoardApp.js
- clients/viewer/browser-host.js
- clients/viewer/src/browser-host/git.js

# Backlog
- none
