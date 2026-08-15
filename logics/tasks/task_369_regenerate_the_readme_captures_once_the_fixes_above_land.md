## task_369_regenerate_the_readme_captures_once_the_fixes_above_land - Regenerate the README captures once the fixes above land
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:26:38

# AI Context
- Summary: Once every other task in this request lands, the README's screenshots and captures need regenerating again, same treatment req_355 gave the previous redesign wave.
- Keywords: readme captures, screenshot regeneration, req_355 precedent
- Use when: Implementing this task, after every other task in req_359 is done.
- Skip when: Any of the actual screen fixes — those are the other tasks.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_798_regenerate_the_readme_captures_once_the_fixes_above_land`

# Acceptance criteria
- AC1: Every README capture affected by this request's fixes is regenerated and visibly reflects the fixed screens.
- AC2: This slice is not started until item_790 through item_797 are Done, so it captures the real end state rather than a partial one.
- AC3: The README includes a capture of the board's list mode (not previously shown at all).
- AC4: The README no longer includes the Health screen capture (reported directly by the operator as deceptive), and no prose references it as if it were still there.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_369_regenerate_the_readme_captures_once_the_fixes_above_land.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_369_regenerate_the_readme_captures_once_the_fixes_above_land.md` after implementation.

# Validation
- `node scripts/dev/capture-readme-media.mjs`: wrote `viewer-board.png`, `viewer-document.png`, `viewer-insights.png`, `viewer-board-list.png` and a regenerated `PROVENANCE.md`, against this repository's own corpus with the board settling on 31 cards.
- `npx vitest run` (the whole suite, 87 files): 956/956 passed. `python3 -m pytest tests/python`: 1386/1386 passed. `node scripts/check-readme-badges.mjs`: OK. `python3 -m logics_manager lint`: OK.
- AC2's precondition checked before starting rather than assumed: item_790 through item_797 all read `Status: Done`.
- The captures were read after generation, not just written: the reader capture shows the short reference `R359 · Draft`, the fifteen-section contents rail on the left and the document filling the width beside it; the list capture shows group headers with live/total counts, per-row status, linked count and age, and the stage-coloured selection outline.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Regenerated the three surviving captures and added `viewer-board-list.png`. The list capture is last in the script's list on purpose: it leaves the board in list mode, and every other capture assumes the columns.
- The Validation health capture is deleted rather than regenerated (AC4), and the prose that introduced it is rewritten so nothing refers to a capture that is gone. `PROVENANCE.md` regenerates itself from the script's own list, so its entry disappeared without being edited.
- Caught by reading the new captures rather than only producing them: the reader's caption still described "a comfortable measure" and "eight sections", both of which item_793 and item_795 had made untrue. Rewritten to describe what the capture now shows.
- Caught by running the *whole* JS suite for the first time in this request, which was overdue: three failures in files earlier waves had not been running.
  - `viewer.state-channels`: `.card--status-blocked` had lost its rule in commit `ab60da2b` of this request. That rule said only `border-left-color`, so moving the accent's colour onto the stage removed the entry entirely, and `blocked` fell back to the base solid 5px -- which is also what an unknown status draws. The one state worth spotting looked like the state that means nothing is known. It has a shape of its own now, like its four siblings.
  - `webview.chrome`: asserted `groupBySelect.disabled`, which stopped existing when item_795 made Group a segmented control. Updated to assert the segments'; the rule it guards is unchanged.
  - `logicsHtml`: the orchestrator webview snapshot. Updated, and the change reviewed rather than accepted blind -- which is how the `<label>` wrapping the new segments was spotted: a label wrapping buttons makes clicking the word "Group" press the first segment.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_798_regenerate_the_readme_captures_once_the_fixes_above_land`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# AC Traceability
- request-AC7 -> This task. Proof: all four published captures regenerated from `scripts/dev/capture-readme-media.mjs` against this repository's corpus after every other slice landed, with the Health capture removed and the board's list mode added. Verified by reading the resulting images, which show the short-ref eyebrow, the left contents rail, the full-width document, and the list's group headers, ages and stage-coloured selection.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
