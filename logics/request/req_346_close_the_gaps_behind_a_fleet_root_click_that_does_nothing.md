## req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing - Close the gaps behind a fleet root click that does nothing
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: One click reported as doing nothing turned out to be three defects: a picker that cannot run without tkinter, a failure reported into an overwritten status line, and a `--fleet` flag that never reaches the server -- plus CodeQL #54 in the same handlers.
- Keywords: fleet root picker, tkinter, folder browser fallback, withPrimaryAction, setMeta, fleet flag, fleetHome landing, path injection, codeql 54
- Use when: Changing a viewer action's failure path, the folder pickers, what `--fleet` decides, or the fleet root endpoints.
- Skip when: Working on the fleet home's design, the board, the details panel or the activity feed.

# Needs
- Reported by the operator, 2026-08-13: the project switcher offers `Add fleet root...`, and clicking it does nothing visible. They also questioned whether the entry belongs there at all.
- It is not doing nothing. The server refuses with a clear reason and the interface puts that reason somewhere nobody looks, then overwrites it.
- Three separate defects sit behind that one click, and the operator met all three at once. Two of them reach well beyond the fleet root picker.
- The fourth item here is CodeQL alert #54, included because it lives in the same three handlers this request already opens.

# Context
- **The picker cannot run on a common macOS install.** `select_project_root_with_native_dialog` in `logics_manager/viewer.py` imports `tkinter` and raises `RuntimeError("Native folder picker is not available in this environment.")` when it cannot. Measured on the reporting machine: `/usr/bin/python3` (Apple) has tkinter, `/opt/homebrew/bin/python3` does not, and the viewer was running on the Homebrew one. `POST /api/select-fleet-root` returns HTTP 500 with that message. This is environment-dependent and silent, so it works for some operators and not others.
- **The recovery already exists, and only one of the two callers uses it.** `pickViewerProjectRoot` catches the same failure and calls `openProjectPickerModal`, an in-browser folder browser backed by the workspace-path endpoint beside it, so `Choose folder...` degrades gracefully and stays usable. `pickFleetRoot`, ten lines below it, throws instead. The fix is not to build a fallback; it is to reach the one that is already built and tested.
- **A failed viewer action is reported where it will not be read.** `withPrimaryAction` ends with `setMeta(error?.message || "Viewer action failed.")`. `setMeta` writes the small grey subtitle under the topbar, beside the document count and the refresh time. `scheduleNextAutoRefresh` calls `renderMeta()`, so the message is overwritten on the next tick -- within 60 seconds by default. This is the path every primary viewer action takes when it fails, not only this one, and it is why the operator read a refusal as nothing happening.
- **`--fleet` does not decide whether the viewer is a fleet viewer.** The `view` command passes `fleet=True` as a literal when it constructs the server, and `args.fleet` is only consulted in three places: whether the launch repo joins the project list, whether the bootstrap prompt is skipped, and which project the opened URL names. So `server.fleet` is always true. Two consequences follow: the switcher offers `Add fleet root...` in every viewer, and `viewer_payload(fleet_home=bool(self.server.fleet and not project_id))` means any request without a `project` query parameter lands on the fleet home whether or not `--fleet` was passed. `docs/cli.md` describes `--fleet` as what starts a fleet viewer, which is not what the code does.
- **CodeQL alert #54, an uncontrolled-path-expression rule, high, open since 2026-08-12, at the `remove-fleet-root` handler.** The user-supplied `root` reaches `Path(...).expanduser().resolve()` before any validation. It is not exploitable as written: `remove_fleet_root` rejects anything absent from the persisted roots before touching the filesystem, and the route is in `VIEWER_MUTATING_ROUTES`, so a non-loopback unpaired client is refused in LAN mode. But the guard is a membership test no analyser recognises as a sanitizer, and the sibling workspace-path handler -- ten lines below, in the same block -- already normalises and asserts containment before use. The asymmetry between two neighbouring handlers is the real defect.
- Out of scope: the fleet home's design, delivered by `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`; the board, panel and activity surfaces, delivered by `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`; and how fleet roots are scanned once added.
- Known risk: whether `Add fleet root...` should appear in every viewer is a product decision, not an implementation detail. `adr_028` scoped the fleet registry to the operator profile, which is an argument for the viewer always being fleet-capable -- but then `--fleet` is close to a no-op and the documentation describing it is wrong. Deciding what the flag means has to come before changing what the menu shows.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host.

# Acceptance criteria
- AC1: On a viewer whose interpreter has no native folder dialog, adding a fleet root still succeeds through the in-browser folder browser the project picker already falls back to.
- AC2: The fleet root picker and the project picker recover through one shared path, so a future change to that recovery cannot fix one and miss the other.
- AC3: When a primary viewer action fails, its reason is presented where an operator will see it and it stays until dismissed or superseded, rather than being overwritten by the next status render.
- AC4: What `--fleet` means is decided and documented, and the code matches the decision: whether the server is a fleet server, and whether a request without a project parameter lands on the fleet home, follow from the flag rather than from a hardcoded value.
- AC5: The project switcher offers fleet root management exactly when the decision in AC4 says it applies.
- AC6: `docs/cli.md` describes what `--fleet` actually does after AC4.
- AC7: The fleet root handler validates its input before using it as a path, in the same shape as the sibling handler that already does, and CodeQL alert #54 closes as fixed rather than dismissed.
- AC8: Tests cover the missing-dialog path reaching the fallback, a failed action surfacing its reason, and the fleet flag deciding both the server mode and the landing view.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- logics_manager/viewer.py
- scripts/build/build-viewer-browser-host.mjs
- docs/cli.md
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- tests/python/test_viewer_cli.py

# Backlog
- `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`
- `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`
- `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`
- `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`
- `item_730_cover_the_three_failure_paths_this_request_found`
