## item_794_workshop_cdx_close_the_remaining_mockup_gaps - Workshop/CDX: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:56

# AI Context
- Summary: Workshop Commands/Explorer and CDX Missions have each shipped most of their approved redesign; this slice closes the remaining, concretely-observed gaps.
- Keywords: workshop commands, workshop explorer, cdx missions, quick-filter chips, mission tiles
- Use when: Implementing this backlog item.
- Skip when: Any other screen family — reader/filters, remote/settings, and insights/health/onboarding are separate slices.

# Problem
The mockup review found most of Workshop/CDX's approved redesign already implemented, with these concrete gaps remaining:
- Commands: no per-prefix quick-filter chips (view/build/check/test) above the filter field; script grouping is shallow (most of ~51 scripts fall under one generic group instead of being split by prefix); no left accent bar per row.
- Explorer: `4 item(s)` still uses the flagged plural-in-parentheses wording when a directory is selected.
- CDX Missions: top strip shows "Strengths 3 / Corpus actions 0" instead of the mockup's "Selected"/"Session" tiles; right panel keeps the old toggle-button shape instead of an always-visible dimmed command preview; the disabled launch button doesn't say why inline; `Fix directly` has no inline consequence text.

# Scope
- In: the five findings listed above, each independently fixable.
- Out:
  - Commands' running-script state (accent + elapsed time + Stop button) — unverified by the review (no script was launched); confirm it separately before treating it as broken.
  - Runbooks' stale-verified amber accent — unverified (no stale runbook exists in the current corpus); confirm once a stale case exists.
  - CI/Release/Settings findings — separate slice (item_796).

# Acceptance criteria
- AC1: Commands shows per-prefix quick-filter chips (view/build/check/test) above the filter field, and scripts are grouped by their own prefix rather than one generic bucket.
- AC2: Commands rows carry a left accent bar matching the mockup.
- AC3: Explorer no longer shows the plural-in-parentheses wording (`4 item(s)`) when a directory is selected.
- AC4: CDX Missions' top strip shows "Selected" (mission name) / "Session" (session + quota) tiles instead of "Strengths"/"Corpus actions".
- AC5: CDX Missions' right panel shows an always-visible dimmed command preview instead of the toggle-button shape; the disabled launch button states why inline; `Fix directly` has inline consequence text.

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
- Priority: Low
- Rationale: Polish on screens whose core redesign already shipped; no user-facing breakage.

# Tasks
- `task_365_workshop_cdx_close_the_remaining_mockup_gaps`
