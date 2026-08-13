## item_740_keep_progress_and_both_modes_honest_at_any_width - Keep progress and both modes honest at any width
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 14:18:13

# AI Context
- Summary: Progress is a horizontal wash across the card, so a finished document at 100% is washed end to end; in list mode that wash spans the full row, and finished work carries more coloured area than live work despite the done-dimming.
- Keywords: card--progress-bar, progress wash, done dimming, aspect ratio, phone width, column collapse
- Use when: Changing how progress is drawn, or how either board mode behaves at phone width.
- Skip when: Which documents are shown, and the board's structure.

# Problem
Progress is drawn as a horizontal wash across the card, filled to `--progress`. At 100% a finished document is washed end to end; `.card--done` then dims it to 55%, which is the right intent.
In list mode that wash spans the full row width instead of a 230px card, so finished work still carries far more coloured area than live work. The encoding does not survive the change of aspect ratio.
At 390px the metric chip already wraps under the title and both modes read well -- the desktop list is that phone layout stretched, which is why it breaks. The phone case is close to correct and must not regress.
# Scope
- In:
  - Encode progress so it reads the same in a narrow card and in a full-width row, and so a finished document never carries more coloured area than a live one.
  - Keep both modes usable at phone width with nothing pushed off-screen: what is a column on a wide screen becomes a subordinate line under the title.
- Out:
  - Which facts a card or row shows, and the board's structure.
# Acceptance criteria
- AC18: Progress is encoded so that it reads the same in a narrow card and in a full-width row, and a finished document never carries more coloured area than a live one.
- AC19: At phone width both modes remain usable with nothing pushed off-screen: the facts that are columns on a wide screen become a subordinate line under the title.

# AC Traceability
- request-AC18 -> This backlog slice. Proof: AC18: Progress is encoded so that it reads the same in a narrow card and in a full-width row, and a finished document never carries more coloured area than a live one.
- request-AC19 -> This backlog slice. Proof: AC19: At phone width both modes remain usable with nothing pushed off-screen: the facts that are columns on a wide screen become a subordinate line under the title.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_345_make_the_project_view_lead_with_the_work_that_is_live` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`.
- Generated locally by logics-manager.
