## task_367_remote_settings_close_the_remaining_mockup_gaps - Remote/Settings: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:22:29

# AI Context
- Summary: Git/CI/Release/Settings have each shipped most of their approved redesign (verdict banners, duplicate tile removal, cost-stating copy); this task closes the remaining diff-colouring, duplicate-tile, and toggle-styling gaps.
- Keywords: git diff colour, ci job sorting, release gate wording, settings toggle styling
- Use when: Implementing this task.
- Skip when: Any other screen family.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_796_remote_settings_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Git diffs are colour-coded (additions/deletions/hunk headers distinguishable), no longer hard-truncate without a way to see the rest, and show a per-file diffstat with the ability to scope to one file.
- AC2: CI drops the old duplicate tile row and sorts jobs slowest-first with a relative-duration indicator.
- AC3: Release's blocking gate is described once, consistently, gates render as a compact wrap-grid instead of stacked full-width blocks, `npm_publication` shows its "optional" annotation, and the old duplicate tile row is dropped.
- AC4: Settings' "Automatic refresh" is a real toggle switch with a "last refreshed" readout, ChatGPT Developer Mode is an inline toggle, `Stop viewer` is visually distinguished as destructive, and `Copy diagnostics` uses a quiet/secondary style.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_367_remote_settings_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_367_remote_settings_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts tests/viewer.reader.test.ts tests/webview.layout-collapse.test.ts`: 259/259 passed.
- AC1 (Git), measured live against a running viewer with a real modified file rather than read from source: additions render `rgb(126, 231, 135)` on `rgba(46, 160, 67, 0.16)` and hunk headers `rgb(78, 161, 255)` -- distinct, and distinct from the delete rule. Per-file diffstat reads `+2-0`, and clicking a file scopes the diff pane to it (`is-active` on that file only).
- AC1 truncation recourse, forced rather than assumed: a 4001-line change to README.md made the server answer `truncated: true, canForce: true`; the pane then reads `README.md · worktree · truncated` and renders the "Load the rest of this diff" button. README.md was reverted afterwards.
- AC2/AC3 (CI, Release), measured live: no `.viewer-ci__summary--strip` on either screen; Release verdict reads `Blocked by git_push. 8 of 8 gates have evidence.` with the reason appearing only on the gate below; 8 gates lay out in 3 columns of 286px over 4 rows with the blocking gate spanning the full 875px row; `optional` marks `npm_publication`; job rows sort 44s, 36s, 35s, 27s with a proportional bar each.
- AC4 (Settings), measured live: two `role="switch"` inputs render 30x17 with `border-radius: 999px` and `appearance: none`; readout reads `Last refreshed 3:34:38 AM`; two quiet buttons compute a transparent background; Stop is `rgb(241, 76, 76)` against Restart's `rgb(210, 153, 34)`.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- AC1 (Git) needed no code: the review's three findings had all been closed by earlier waves -- diff colouring by the `.viewer-git__diff-line--add/delete/hunk/meta` rules, the truncation recourse by item_732's "Load the rest of this diff" button, and the per-file diffstat and scoping by `renderChangeStats` and `data-viewer-git-file`. Verified live rather than assumed, including forcing a truncated diff to see the recourse actually appear. Recorded as already delivered, not re-implemented.
- AC2 (CI): dropped the State/Branch/Commit/Match tile row that duplicated the verdict banner directly above it. Branch and Match lived only in those tiles, so they moved onto the "Latest run" list rather than being dropped with them. Jobs now sort slowest-first within their group -- failing-first from item_734 is untouched, since sorting across groups would undo it -- and each row carries a bar drawn against the slowest job in the run. The bar is a ratio, not a duration in pixels, and is suppressed for a single job, where it would state a ratio of one job to itself.
- AC3 (Release): dropped its tile row too, moving Version onto the state list. The blocking gate was described three times at once; the verdict now names the gate and stops, the gate itself carries the reason (it is already moved to the front and opened to do exactly that), and `next_action` is suppressed when it is the server restating that same reason. Gates lay out in a wrap-grid instead of eight full-width blocks stacked down the screen, with the blocking gate spanning its own row since it is the one tall cell. `optional` is shown on a passing gate too, reversing item_736: a passing optional gate is what makes "8 of 8 pass" mean something other than it appears.
- AC4 (Settings): both switches carried `role="switch"` while the browser drew a checkbox -- the control announced one thing and looked like another -- and are real switches now. Added a "last refreshed" readout, since the interval says how often a refresh is meant to happen, which is not the same claim as when one did. ChatGPT Developer Mode flips inline, with a refusal putting the switch back; the connector screen still owns the URL and token, which a toggle cannot carry. `Copy diagnostics` had to opt out of `.btn`'s solid primary background to be quiet. `Stop viewer` is red where `Restart` stays amber: item_737 gave both the same cautionary colour, but Restart comes back on its own and Stop needs a terminal to undo.
- Caught mid-change: removing the first `viewer-ci__summary--strip` match hit CI's copy rather than Release's, leaving Release referencing a deleted `cards`. The viewer's own failure surface (item_730/item_742) reported it verbatim as "Checking release workflow failed / cards is not defined" instead of rendering a blank screen, which is how it was found in one pass.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_796_remote_settings_close_the_remaining_mockup_gaps`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# AC Traceability
- request-AC6 -> This task. Proof: each Remote/Settings finding in item_796 is resolved and measured live -- AC1's three Git findings verified as already delivered by earlier waves (including forcing a truncated diff to see the recourse appear), AC2's tile row and job ranking, AC3's single gate description, wrap-grid and `optional` mark, AC4's switches, readout, quiet and destructive styling. Nothing in this slice is deferred.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
