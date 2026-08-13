## item_770_measure_how_long_these_screens_take_and_say_so_while_they_load - Measure how long these screens take and say so while they load
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 16:05:55

# AI Context
- Summary: All three screens take twenty seconds or more against this corpus, and while they load the viewer leaves the previous screen up with a status line nobody reads; nothing measures it and this request adds computation to them.
- Keywords: load time, time to useful, loading state, meta line, corpus insights, validation health, getting started, regression baseline
- Use when: Changing how long Corpus insights, Validation health or Getting Started take, or what they show while loading.
- Skip when: The content of those screens, covered by the sibling slices.

# Problem
Measured while capturing for the review: a screenshot taken seven seconds after the click returned the previous screen, and only a wait of twenty-two seconds reliably produced the intended one. During that time the viewer leaves the old screen in place with `Loading insights...` in the meta line -- the same small grey line whose unreadability is the subject of a separate request.
Nothing measures this, so there is no number to regress against.
And this request adds work to all three screens: per-stage corpus counts on Getting Started, per-file grouping and a fixable count on Validation health, and a signal classification on Corpus insights. Each is cheap in isolation and none has been measured.
# Scope
- In:
  - Measure time-to-useful for each of the three screens against a corpus of this size, and record it where a later change can be compared against it.
  - Show that the screen is working and what it is waiting for, rather than leaving the previous screen with a status line.
  - Measure anything this request computes before it lands, so no slice makes a screen slower to become useful.
- Out:
  - Optimising the underlying scans; this establishes the number and the guard, not the speed-up.
  - The meta line's own redesign, which belongs to the visible-failures request.
# Acceptance criteria
- AC16: How long each of these screens takes to become useful is measured against a corpus of this size, and the measurement is recorded so a later change can be compared against it rather than guessed at.
- AC17: A screen that cannot answer immediately says that it is working and what it is waiting for, rather than leaving the previous screen in place with a status line the operator will not read.
- AC18: Nothing added by this request makes any of the three slower to become useful than it is today; where a proposal computes something new, it is measured before it lands.

# AC Traceability
- request-AC16 -> This backlog slice. Proof: AC16: How long each of these screens takes to become useful is measured against a corpus of this size, and the measurement is recorded so a later change can be compared against it rather than guessed at.
- request-AC17 -> This backlog slice. Proof: AC17: A screen that cannot answer immediately says that it is working and what it is waiting for, rather than leaving the previous screen in place with a status line the operator will not read.
- request-AC18 -> This backlog slice. Proof: AC18: Nothing added by this request makes any of the three slower to become useful than it is today; where a proposal computes something new, it is measured before it lands.

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
- Request: `logics/request/req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print.md`.
- Generated locally by logics-manager.
