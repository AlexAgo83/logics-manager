## item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe - Make the Review bursts payload lazy, refreshable, and failure-safe
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 15:14:52

# AI Context
- Summary: Makes the Review bursts payload cheap enough to refresh: counts up front, a burst's files on selection, and failures returned rather than raised.
- Keywords: review, bursts, payload, lazy, refreshable, failure, safe
- Use when: changing the Review burst payload, its refresh wiring, or its Git error handling.
- Skip when: working on the Review UI's keyboard or layout.

# Problem
- `review_bursts_payload` runs two `git show` processes per commit for up to fifty commits, about a hundred subprocesses and 1.6 seconds per request measured on this repository, and computes the file list of every burst although only one is displayed.
- That cost is why `req_381` AC8 was never implemented: Review is loaded only by the surface click and never by the viewer refresh path.
- `_commit_review_files` calls `_run_read_only_git` without the try/except every other payload in the module uses, so a timeout escapes the route.
- Numstat is keyed on the pre-rename path while name-status reports the post-rename path, so renamed files render as +0-0.

# Scope
- In:
  - Return bursts with file counts and addition/deletion totals from data already gathered, without reading any commit's file list.
  - Add or extend a bounded endpoint that returns one burst's file list on selection, following the file-scoped commit diff already in the module.
  - Load a burst's files when that burst is selected in the timeline, keeping the working-tree burst's files available from the status payload.
  - Wire Review into the existing viewer refresh path so a Git status update refreshes it, with no second interval or polling loop.
  - Wrap the Git calls in the same try/except the sibling payloads use, returning `state`/`message` for timeouts, OS errors, and non-zero exits.
  - Key the numstat lookup on the path name-status reports, so renamed files carry their real counts.
  - Record the measured subprocess count and duration before and after in the slice's validation.
- Out:
  - Changing the burst ordering, the working-tree burst, or the commit history limit.
  - Caching burst files across requests.
  - The surface state and the Explorer.

# Acceptance criteria
- AC1: The bursts payload issues no per-commit Git call; a test asserts the subprocess count does not grow with the number of commits.
- AC2: Each burst carries a file count and addition/deletion totals.
- AC3: Selecting a burst fetches that burst's files through a bounded endpoint, and the working-tree burst still resolves from the status payload.
- AC4: A Git status refresh from the existing viewer refresh path updates Review, and no new interval or polling loop is added.
- AC5: A timeout, OS error, and non-zero exit each return a structured state and message; no request handler raises.
- AC6: A commit containing a rename reports the real addition and deletion counts for the renamed file.
- AC7: Python tests cover the bounded call count, the per-burst file endpoint, the failure states, and the rename case.
- AC8: The bundle is regenerated and the targeted pytest and vitest checks and `npm run lint` pass for this slice.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC2: Each burst carries a file count and addition/deletion totals. Also: AC3: Selecting a burst fetches that burst's files through a bounded endpoint, and the working-tree burst still resolves from the status payload.
- request-AC4 -> This backlog slice. Proof: AC1: The bursts payload issues no per-commit Git call; a test asserts the subprocess count does not grow with the number of commits.
- request-AC5 -> This backlog slice. Proof: AC4: A Git status refresh from the existing viewer refresh path updates Review, and no new interval or polling loop is added.
- request-AC6 -> This backlog slice. Proof: AC5: A timeout, OS error, and non-zero exit each return a structured state and message; no request handler raises.
- request-AC7 -> This backlog slice. Proof: AC6: A commit containing a rename reports the real addition and deletion counts for the renamed file.
- request-AC15 -> This backlog slice. Proof: AC8: The bundle is regenerated and the targeted pytest and vitest checks and `npm run lint` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Primary task(s): `task_396_orchestrate_the_review_and_explorer_repair`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_396_orchestrate_the_review_and_explorer_repair`

# Notes
- Task `task_396_orchestrate_the_review_and_explorer_repair` was finished via `logics-manager flow finish task` on 2026-08-23.
