## item_796_remote_settings_close_the_remaining_mockup_gaps - Remote/Settings: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:56

# AI Context
- Summary: Git/CI/Release/Settings have each shipped most of their approved redesign (verdict banners, duplicate tile removal, cost-stating copy); this slice closes the remaining diff-colouring, duplicate-tile, and toggle-styling gaps.
- Keywords: git diff colour, ci job sorting, release gate wording, settings toggle styling
- Use when: Implementing this backlog item.
- Skip when: Any other screen family.

# Problem
The mockup review found Git/CI/Release/Settings had each already shipped substantial parts of their redesign (populated-state defaults, duplicate tile-row removal for the verdict banner, cost-stating restart/stop copy, the new "This viewer" state card), with these gaps remaining:
- Git: diff is uncoloured (additions/deletions/hunks all one grey); diff still hard-truncates with no way to see the rest; no per-file diffstat list with change bars or per-file scoping.
- CI: the old State/Branch/Commit/Match tile row still duplicates the new verdict banner; jobs aren't sorted slowest-first and have no relative-duration bar.
- Release: the blocking gate is still described three different ways at once (tile, pill, substate); gates render as 8 stacked full-width blocks instead of a compact wrap-grid; `npm_publication`'s "optional" annotation is missing; the old tile row still duplicates the verdict sentence.
- Settings: "Automatic refresh" is a checkbox+label, not a real toggle, with no "last refreshed" readout; ChatGPT Developer Mode is a button-to-a-panel, not an inline toggle; `Stop viewer` isn't visually distinguished as destructive; `Copy diagnostics` is a solid primary button instead of a quiet one.

# Scope
- In: all findings listed above.
- Out:
  - CI's failing-run layout (red leads, green folds) and Release's failing-run fold/expand behaviour — both unverified by the review (no failing run exists in this sandbox to drive); confirm against a real failing run before treating as broken or fixed.
  - Git's verdict banner colour semantics — flagged as worth confirming against the design system's intended colour mapping, not a clear-cut bug.

# Acceptance criteria
- AC1: Git diffs are colour-coded (additions/deletions/hunk headers distinguishable), no longer hard-truncate without a way to see the rest, and show a per-file diffstat with the ability to scope to one file.
- AC2: CI drops the old duplicate tile row and sorts jobs slowest-first with a relative-duration indicator.
- AC3: Release's blocking gate is described once, consistently, gates render as a compact wrap-grid instead of stacked full-width blocks, `npm_publication` shows its "optional" annotation, and the old duplicate tile row is dropped.
- AC4: Settings' "Automatic refresh" is a real toggle switch with a "last refreshed" readout, ChatGPT Developer Mode is an inline toggle, `Stop viewer` is visually distinguished as destructive, and `Copy diagnostics` uses a quiet/secondary style.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Each of the per-screen findings listed under Workshop/CDX, Reader/modal/filters, Remote/Settings, and Insights/Health/Onboarding above is either resolved to match its mockup's "Proposed" design, or explicitly deferred with a stated reason (e.g. a state genuinely unreachable in this corpus, or a deliberate design deviation from the mockup).

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: The largest single cluster of findings (13); git diff colouring in particular is a cheap, high-value fix.

# Tasks
- `task_367_remote_settings_close_the_remaining_mockup_gaps`

# Notes
- Task `task_367_remote_settings_close_the_remaining_mockup_gaps` was finished via `logics-manager flow finish task` on 2026-08-15.
