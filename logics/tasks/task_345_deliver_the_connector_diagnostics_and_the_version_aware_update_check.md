## task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check - Deliver the connector diagnostics and the version-aware update check
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Establish the child's exit status and retain its output first, then check the post's response, then invalidate the update cache on the tool's version, then the connector wording.
- Keywords: connector diagnostics, exit status, retained output, response check, cache invalidation, delivery order
- Use when: Implementing the connector diagnostics or the version-aware update check.
- Skip when: Working on the screen redesigns (task_341, task_342, task_344) or the fleet root work (task_343).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Start with the connector's exit status and retained output: it is the deepest of the three layers and the other two are cheap once a reason exists to show.
- [x] 2. Then the unchecked response, coordinating with the sibling request on where a failure is displayed rather than inventing a second place.
- [x] 3. Then the update cache, which is self-contained.
- [x] 4. Then the wording on the connector screen.
- [x] 5. Write each test beside its change and verify it fails when the defect is reintroduced, rather than assuming it would.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`
- `item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done`
- `item_743_end_the_update_banner_when_the_update_happens`
- `item_744_make_the_connector_screen_state_and_action_agree`
- `item_745_cover_a_silent_failure_and_a_stale_banner`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: the capture thread keeps a bounded tail of the child's output and `_mcp_connector_failure_reason` prefers the child's own last line over anything the viewer could invent. Verified against a live viewer with port 8766 occupied: the payload carried `Port 8766 on 127.0.0.1 is already in use ... Pass --port <n> for a different one.` verbatim.
- request-AC2 -> This task. Proof: `capture()` now calls `process.wait()` before judging the outcome. The old guard read `process.returncode` straight after the stdout loop, where it is still None because nothing had awaited the child, so the fallback error could never fire. `test_viewer_mcp_connector_reports_the_child_s_own_reason` fails when that guard is restored.
- request-AC3 -> This task. Proof: output is retained in a 20-line tail rather than only what matched one of two regexes. `test_viewer_mcp_connector_failure_reason_prefers_the_child_over_its_own_wording` covers the three cases: a child that spoke, a child that exited silently with a code, and a child that exited silently without one.
- request-AC4 -> This task. Proof: the connector POST goes through `withPrimaryAction` and throws unless `response.ok` and `data.ok`. `checks the connector POST response instead of rendering a refusal as done` asserts the shape and that the old `.then(() => showChatgptMcp())` is gone from the handler's code lines.
- request-AC5 -> This task. Proof: `test_viewer_cdx_update_banner_ends_when_the_tool_is_updated` replaces the executable mid-test and asserts the banner ends without a restart and without waiting for the expiry.
- request-AC6 -> This task. Proof: the cache key includes `_cdx_executable_fingerprint`, so replacing the executable through pip, npm or brew invalidates the answer. Verified load-bearing: reverting the key to the repository root alone makes that test fail. The limit is stated in the docstring -- a launcher shim that never moves still relies on the 24h expiry.
- request-AC7 -> This task. Proof: the button is named after the verb it performs (`Start the connector` / `Stop the connector`) rather than after the state the heading already gives, and the stop reason is set apart from the surrounding copy. `names the connector action after what it does, not after the state` asserts the old wording is gone.
- request-AC8 -> This task. Proof: three checks, one per path -- `test_viewer_mcp_connector_reports_the_child_s_own_reason` (a connector that exits before publishing a URL), `checks the connector POST response instead of rendering a refusal as done` (a post whose response reports failure), `test_viewer_cdx_update_banner_ends_when_the_tool_is_updated` (a banner surviving the update it recommended). The first and third were each verified to fail when their defect is reintroduced.
# Validation
- (no validation recorded yet)
- npm run lint, npx vitest run and python3 -m pytest tests/python/test_viewer_cli.py passed on 2026-08-13: lint OK, 82 files / 869 vitest tests passed, 162 python tests passed; connector reason verified end to end against a live viewer with port 8766 occupied
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`, `item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done`, `item_743_end_the_update_banner_when_the_update_happens`, `item_744_make_the_connector_screen_state_and_action_agree`, `item_745_cover_a_silent_failure_and_a_stale_banner`
- Related request(s): `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`

# Links
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
