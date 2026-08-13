## item_733_say_each_git_fact_once - Say each Git fact once
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 62%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:52:34

# AI Context
- Summary: The `Remote` domain's whole content is two lines already printed verbatim in the tiles above it, and the staged, worktree and untracked counts appear in both the tiles and the domain rail.
- Keywords: remote domain, duplicated counts, git tiles, domain rail, redundant navigation
- Use when: Removing or consolidating duplicated Git facts and navigation entries.
- Skip when: Which git facts are collected, and the remote-related actions.

# Problem
- The `Remote` domain's entire content is two lines already printed verbatim in the tiles above it, and the staged, worktree and untracked counts appear in both the tiles and the domain rail.

# Scope
- In:
  - Retire the navigation entry whose content is shown elsewhere on the same screen.
  - Keep each count in one place.
- Out:
  - Which git facts are collected, and the remote-related actions.

# Delivery notes
- **The `Remote` domain is retired.** Its entire panel was `Tracking <ref>` and `Ahead N, behind M`, both printed verbatim in the tiles above it -- a navigation entry whose only content is elsewhere on the same screen is a place to go that takes you nowhere.
- **The `Files` tile is retired.** It printed Staged, Worktree and Untracked, the same three counts the domain rail below it carries -- and the rail is also the control that scopes the list. A count in two places is a count an operator has to reconcile; the one that does something when clicked is the one that stays.
- What remains is four tiles (Branch, Tracking, Ahead / Behind, State) and five domains (changes, staged, worktree, untracked, history). `changes` and its parts are a total and its breakdown inside one control group, which is not the same as printing a number twice.
- The test that asserted the old shape is rewritten to assert the new one, including that no domain named `remote` exists and that the summary segments no longer carry `Staged`.

# Acceptance criteria
- AC6: No count or fact appears twice, and no navigation entry duplicates the screen.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: No count or fact appears twice, and no navigation entry duplicates the screen.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
