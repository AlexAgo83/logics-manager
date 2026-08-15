## task_368_insights_health_onboarding_close_the_remaining_mockup_gaps - Insights/Health/Onboarding: close the remaining mockup gaps
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
- Summary: Insights, Health, and Getting Started have each shipped substantial parts of their approved redesign; this task closes the remaining tile-shape, grouping, and action-button gaps.
- Keywords: insights verdict card, health fixable count, stat tile strip, getting started action pair
- Use when: Implementing this task.
- Skip when: Any other screen family.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_797_insights_health_onboarding_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Insights' summary card shows a `verdict--ok/warn/bad` treatment with an inline primary action button; stat tiles render as a thin horizontal strip; "Flow health" is grouped into "needs a decision" vs. "expected while work is in flight", with the latter visually dimmed.
- AC2: Health shows a "Fixable" count, and "Apply fixes…" states how many findings it would address; stat tiles render as a thin strip.
- AC3: Each Getting Started stage offers a create-action + look-action pair, not a single button.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_368_insights_health_onboarding_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_368_insights_health_onboarding_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts tests/viewer.reader.test.ts tests/webview.layout-collapse.test.ts`: 261/261 passed.
- `python3 -m pytest tests/python`: 1383/1383 passed (audit.py gained the `autofix_codes` declaration).
- Insights, measured live against a running viewer: hero carries `viewer-insights__hero--bad` with `border-left-color: rgb(241, 76, 76)` and the action "Open Health (449 findings)"; the stat row computes `padding: 6px 10px` (the thin strip); Flow health renders the subheads "Needs a decision" and "Expected while work is in flight", the second group computing `opacity: 0.72`.
- Health, measured live: the button reads `Apply fixes… (7)`, enabled, with the hint "Repairs 7 findings: ac_missing_task_traceability. Shows which documents would be edited before applying anything".
- Getting Started, measured live: all four stages return two actions each -- `[New Request, Open the board]`, `[Open the board, Open Insights]`, `[CDX Missions, Open the board]`, `[Open Health, Open Insights]`.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Insights: the summary was the same neutral grey whether nothing was flagged or forty things were. It carries the verdict on its left edge -- the treatment Health and Release already use -- with the one action that answer leads to. The action is deliberately singular: quality findings belong to Health, and everything else on this screen is a list you read rather than a thing you do. Stat tiles moved to the thin strip Git, CI and Health already share.
- Insights/Flow health: item_747 had already split defects from work-in-flight, but left both in one list where only a tone told them apart. The split is structural now -- "Needs a decision", then "Expected while work is in flight", dimmed rather than hidden, because reading the queue as a problem is the mistake the grouping exists to prevent.
- Health: "Apply fixes…" said neither how many findings it would touch nor which, so the only way to find out was to press it. `audit.py` already filtered on the set of codes its repairs can fix; that set is now declared once (`AUTOFIX_STRUCTURE_CODES`/`AUTOFIX_AC_TRACEABILITY_CODES`) and travels in the payload as `autofix_codes`, so the button counts against the repair's own declaration instead of a copy on the client that would drift the first time a repair is added. The button disables itself and says why when the count is zero.
- Getting Started: each stage offers a place to act and a place to look. Delivery Slices is the deliberate deviation from the mockup's create+look pair -- no onboarding action creates a backlog item, and labelling `new-request` as one would have the button say something it does not do. It gets board + Insights instead: the board is where a slice is actually created, from the column's own "+".
- Test contract updated rather than worked around: "no action is offered twice on the screen" no longer holds once stages are paired, since the board is legitimately the look-destination of more than one stage. What is asserted now is that no stage offers the same button to itself twice, and that every stage offers at least two.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_797_insights_health_onboarding_close_the_remaining_mockup_gaps`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# AC Traceability
- request-AC6 -> This task. Proof: every Insights/Health/Onboarding finding in item_797 is resolved and measured live against a running viewer -- Insights' verdict treatment, thin strip and two-group Flow health; Health's fixable count and thin strip; Getting Started's paired stage actions. The one deviation (Delivery Slices has no create action) is stated with its reason in the Report rather than silently dropped.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
