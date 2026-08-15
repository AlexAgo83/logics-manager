## task_365_workshop_cdx_close_the_remaining_mockup_gaps - Workshop/CDX: close the remaining mockup gaps
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
- Summary: Workshop Commands/Explorer and CDX Missions have each shipped most of their approved redesign; this task closes the remaining, concretely-observed gaps.
- Keywords: workshop commands, workshop explorer, cdx missions, quick-filter chips, mission tiles
- Use when: Implementing this task.
- Skip when: Any other screen family — reader/filters, remote/settings, and insights/health/onboarding are separate tasks.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_794_workshop_cdx_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: Commands shows per-prefix quick-filter chips (view/build/check/test) above the filter field, and scripts are grouped by their own prefix rather than one generic bucket.
- AC2: Commands rows carry a left accent bar matching the mockup.
- AC3: Explorer no longer shows the plural-in-parentheses wording (`4 item(s)`) when a directory is selected.
- AC4: CDX Missions' top strip shows "Selected" (mission name) / "Session" (session + quota) tiles instead of "Strengths"/"Corpus actions".
- AC5: CDX Missions' right panel shows an always-visible dimmed command preview instead of the toggle-button shape; the disabled launch button states why inline; `Fix directly` has inline consequence text.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_365_workshop_cdx_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_365_workshop_cdx_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts tests/viewer.reader.test.ts tests/webview.layout-collapse.test.ts`: 268/268 passed.
- Commands, driven live: six chips rendered from the repository's own prefixes -- `test 9`, `npm scripts 8`, `check 6`, `audit 3`, `lint 3`, `build 2`. Clicking `test` took the list from 51 rows to 9 with the summary reading "9 of 51 commands under test"; clicking it again restored 51 with no chip active.
- Explorer, measured on the live endpoint: `/api/workspace-preview?path=clients` now answers `4 items`.
- CDX Missions, driven live: the strip reads `Missions 5`, `Sessions 15`, `Selected: Full audit`, `Session: work4 · 100% remaining`. The command preview renders at `opacity: 0.78` with "Preview to see the exact command." before a plan exists, and the blocked-launch reason and the Fix-directly note are both present inline.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Commands/AC1: the chips are derived from the prefixes the repository actually uses, not the four the mockup names -- those were what its own repository had, and a chip offering a filter that matches nothing here is worse than no chip. Ordered by how many commands each holds, capped at six, and prefixes with a single command are left out. The chip is its own state rather than text typed into the filter box: "test" as free text also matches `latest` and anything whose command body mentions it. Clicking the active chip clears it, because a filter you cannot take off is a trap.
- Commands/AC1, second half: grouping by prefix was already delivered -- `workshopCommandGroup` splits on the colon, and only 9 of this repository's 51 scripts have no prefix to split on. Verified rather than re-implemented.
- Commands/AC2: the left accent carries the row's state rather than being one colour for every row -- running, then passed or failed from the exit code. Derived past `state`, which stops at `running`/`idle`: how a finished script ended is in its exit code, and that is what a reader scanning a list wants.
- Explorer/AC3: `N item(s)` came from the server, not the client. The reader knows whether one is plural; the parentheses only ask them to.
- Missions/AC4: `Strengths` and `Corpus actions` counted things nobody had asked about, beside two facts a launch depends on that were readable only by hunting through the controls. The strip states which mission is selected and which session it would run in, with how much quota is left.
- Missions/AC5: the command preview is the one real gap -- the control that launches a command and the statement of that command were never on screen together, since the command lived behind the output panel's "Plan preview" switch. It sits beside the launch button now, dimmed, because it is there to be checked before pressing rather than read. The other two parts of AC5 were already delivered: the disabled launch button already carried its reason inline (`viewer-cdx__blocked-reason`) and `Fix directly` already had its consequence note. Verified and recorded as such.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_794_workshop_cdx_close_the_remaining_mockup_gaps`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# AC Traceability
- request-AC6 -> This task. Proof: each Workshop/CDX finding in item_794 is resolved and driven live -- the derived prefix chips filtering 51 rows to 9, the state-carrying row accent, the corrected Explorer plural on the live endpoint, and Missions' Selected/Session tiles with the always-visible command preview. Two parts of AC5 were found already delivered and are recorded as verified rather than claimed as new work. The three findings item_794 scoped out (Commands' running state, Runbooks' stale accent, CI/Release/Settings) stay out.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
