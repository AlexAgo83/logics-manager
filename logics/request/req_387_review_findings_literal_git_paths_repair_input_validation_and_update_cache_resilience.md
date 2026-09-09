## req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience - Review findings: literal Git paths, repair input validation and update cache resilience
> From version: 2.23.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 85%
> Complexity: High
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:39:26

# AI Context
- Summary: Repository review reproduced an overbroad Git commit, malformed repair input causing writes, and update-cache exceptions; operator reports include a stale surface selector and projects/favorites disappearing on reopen but returning after the discovery root is reset. Scope delivery while preserving the distinction between reproduced defects, operator observations and the unconfirmed refresh suspicion.
- Keywords: review, findings, literal, git, paths, repair, input, validation, update, cache, resilience
- Use when: Triaging reproduced viewer mutation and update-cache failures, reported navigation and persistence issues, or suspected Review refresh failures.
- Skip when: Planning unrelated UI changes or claiming release readiness.

# Needs
- P1: Commit exactly the files selected in the viewer, including filenames containing Git pathspec metacharacters.
- P1: Reject malformed repair requests before invoking any document mutation.
- P2: Treat invalid update-cache structure or timestamps as cache misses, so optional update checks cannot break ordinary commands or viewer payloads.
- P2: Keep the Activity / Project / Review selector visually synchronized with the displayed surface after adding a project.
- P2: Restore the selected Fleet project-discovery root when reopening the viewer so its discovered projects and favorites remain available.
- P2: Make the Fleet root-selection and project-folder selection screens understandable to the operator: explain what the chosen folder controls and make browsing, confirming and cancelling unambiguous.
- P2: Keep grouped Recent Activity rows within the available viewport width, including long chain titles and expanded groups.
- Investigate: Verify whether the Review surface refreshes automatically while it remains open; the operator suspects stale content but is not certain.
- The operator authorized a ready-to-develop corpus after review capture. Eight bounded backlog slices and one delivery task cover the findings; F6 remains an investigation with a valid no-fix outcome.

# Context
- Reviewed checkout HEAD: `199dd7c4`, version `2.23.0`, on 2026-09-09; working tree initially clean. Code inspection focused on viewer HTTP dispatch, Git selection/preview/commit, update checks, MCP context helpers and the CI runner. This is not an exhaustive audit or a visual certification.
- Initial `logics-manager status` reported zero open workflow documents; `health --format json` reported 1,812 documents and zero issues. Searches for apply-fixes, pathspec/literal paths and update-cache validation found no existing request capturing these exact failures. Earlier item_751 covers valid dry-run repair behavior and req_278 covers Content-Length handling; this review identifies the repair route's remaining failure path.

## F1: Git expands selected filenames into pathspecs (P1)
- Evidence: `logics_manager/viewer_git.py:570` and `:579` pass selected names after `--` to `git add` and `git commit`. `_normalize_git_file_path` checks filesystem containment, but does not make Git interpret the operand literally.
- Reproduction: initialize a temporary Git repository with a base commit; create two untracked files named `part*.txt` and `part-secret.txt`; call `git_commit_payload(root, ['part*.txt'], 'selected file only')`; inspect `git show --format= --name-only HEAD`.
- Observed: the function reports success and `files: ['part*.txt']`, but the actual commit contains both files. An unselected change is therefore committed while the response claims only the selected file.
- Root cause and candidate direction: `--` separates options from pathspecs; it does not disable wildcard interpretation. Use Git's literal-pathspec facility at the shared invocation boundary and cover sibling diff callers as applicable.

## F2: Malformed preview input falls back to writing repairs (P1)
- Evidence: `logics_manager/viewer.py:3143-3158`. JSON parsing errors set `preview = False`, then invoke `audit_payload` with both autofix flags enabled. The route does not use `_read_json_body_strict`. `clients/viewer/src/browser-host/index.js:4145-4188` normally requests a preview before operator confirmation.
- Reproduction: use a temporary corpus with a request missing Definition of Ready, as in `tests/python/test_viewer_cli.py:493`; invoke `LogicsViewerRequestHandler._handle_apply_fixes_post` with path **/api/apply-fixes**, body `b'{"preview":'` and its exact Content-Length. Use a minimal server object whose `viewer_payload` returns an empty object; capture the JSON response.
- Observed with the real audit implementation: `autofix.enabled = True`, `dryRun = False`, `modified_files = ['logics/request/req_001_thing.md']`; comparing document bytes before/after confirms a write. A separate mocked-audit probe confirmed the same flags. These probes ran only on temporary data.
- Candidate direction: validate Content-Length, JSON object shape and preview type before calling the audit; invalid requests must return a client error and leave documents untouched. Existing valid-preview coverage exercises the audit function rather than this HTTP parsing failure.

## F3: Invalid update-cache values escape the optional check (P2)
- Evidence: `logics_manager/update_check.py:126-134` calls `.get()` and `int()` before validating the cache's shape, outside its read/JSON exception handler. Callers include `logics_manager/cli.py:499-504` before command dispatch and `logics_manager/viewer.py:206` before its protected introspection block.
- Reproduction: write `[]` to a temporary cache file, then call `get_update_info('2.23.0', cache_path=path, now=100, fetch_latest=lambda: None)`; repeat with `{"checked_at":"invalid"}`.
- Observed: `AttributeError` for the array and `ValueError` for the timestamp. Neither is caught along these caller paths. The CLI notice path requires interactive stdout and is skipped in JSON mode; the viewer update payload is also affected.
- Candidate direction: validate the cache object and timestamp before consuming them, and recover through the existing cache-miss path.

## F4: Adding a project leaves the surface selector visually stale (P2, operator-reported)
- Source: operator observation reported during this review on 2026-09-09; not independently reproduced in a browser yet.
- Reproduction scenario: start in the Project surface, add a project in the Logics Manager viewer, then inspect both the displayed content and the Activity / Project / Review selector.
- Observed by the operator: the content switches to Activity, but the selector remains visually stuck instead of reflecting the active surface.
- Expected behavior: returning to Activity is acceptable and should be preserved; the selector must immediately show Activity as selected and remain synchronized when subsequently choosing Project or Review.
- Investigation entry point: project selection and surface switching in `clients/viewer/src/browser-host/index.js`. Root cause is not established by this capture; do not treat the report as proof that clicks are blocked.

## F5: Discovered projects and favorites disappear after reopening the viewer (P2, operator-reported)
- Source: operator observation reported during this review on 2026-09-09; not independently reproduced yet.
- Reproduction scenario: discover projects in the viewer, mark some as favorites, close the viewer, then reopen it with `logics-manager view` and inspect the project list and favorites.
- Initial observation: the previously discovered project list and favorites were no longer visible after reopening.
- Follow-up observation: resetting the Fleet project-discovery root to the Documents folder restored both the projects and their existing favorites. The operator did not report having to mark the favorites again. This narrows the investigation toward discovery-root persistence or restoration; permanent deletion of favorites is not supported by this observation.
- Expected behavior: restore the selected discovery root on reopening, with its existing projects and favorite markers available; the operator should not have to reset that root each session.
- Investigation boundary: distinguish reopening the browser from restarting the viewer process, and record the selected discovery root before/after, launch directory, browser profile and server address during reproduction. Determine whether the root is not saved, not restored, overridden at startup or whether discovery fails to use it. Root cause remains unconfirmed.

## F6: Review may require closing and reopening to refresh (unconfirmed suspicion)
- Source: tentative operator report during this review on 2026-09-09. The operator explicitly expressed uncertainty; no independent reproduction or root cause is established.
- Suspected behavior: the Review surface may not update automatically; closing and reopening that surface appears necessary to see updated information.
- Investigation scenario: keep Review open, make a relevant change in the active repository, wait for the configured automatic refresh interval, and compare the displayed information with the repository state. Then leave and reopen Review and compare again. Record the type of change, refresh settings and observed delay.
- Expected outcome: establish whether this is a defect, normal refresh latency or a configuration effect before committing to a fix. If confirmed, Review should show relevant changes through the normal refresh mechanism without requiring the operator to close and reopen it.

## F7: Fleet root and project-folder selection screens are unclear (P2, operator feedback with screenshot)
- Source: operator feedback and the supplied screenshot titled "Choose fleet root" during this review on 2026-09-09. The operator asks for this screen to be reconsidered; no redesign is implemented by this capture.
- Visible evidence: the dialog leads with a technical explanation that the native folder picker is unavailable and a fallback browser is being used. It opens at the user's home folder with hidden configuration folders dominating the visible list. Controls include "Parent", "Select this folder", "Cancel", "Close" and a close icon; Parent appears disabled in the screenshot.
- Usability concern: the screen does not clearly explain what a Fleet root means for project discovery, or distinguish entering a folder from selecting it as the root. The duplicate Cancel/Close actions leave their respective effects unclear. These are usability observations, not evidence that those controls malfunction.
- Candidate direction: use task-oriented copy explaining the discovery scope, a clear current-folder location and navigation, and an obvious confirmation action with an understandable cancellation path. Consider reducing hidden-folder clutter while preserving access when needed. The screenshot supports reviewing this flow, not prescribing a particular layout or technical implementation.
- Additional operator screenshot: "Choose project folder" shows the same technical fallback message, hidden-folder list and Select/Cancel/Close ambiguity. The operator explicitly requests the same usability work for individual project selection; both flows are in scope.
- Relation to F5: make the selected discovery root understandable and visible to the operator; separately verify that the chosen value is restored on reopening.

## F8: Grouped Recent Activity content overflows the viewport (P2, operator report with screenshot)
- Source: operator screenshot and report during corpus preparation on 2026-09-09. The row headed "8 documents in one chain" extends toward/beyond the right edge; the operator observes horizontal overflow when this group appears.
- Cause is unconfirmed: the group row may expose a width constraint problem in its parent layout rather than originate it. Inspect the actual DOM and computed widths before choosing a fix.
- Entry point: `clients/shared-web/media/webviewChrome.js` creates the activity-panel__chain button with a count and chain title. Trace its stylesheet and all flex/grid ancestors, plus expanded child entries.
- Expected behavior: collapsed and expanded groups fit the available activity view width. Long titles remain understandable through wrapping or accessible truncation; group expansion and keyboard access remain usable. Do not merely hide page overflow and clip controls.

## Validation evidence
- `rtk npm run ci:check`: failed at npm audit policy, before Python lint/tests and compile. Earlier asset generation, changelog freshness, strict Logics lint, packaging metadata, doctor, request-sync stability, grouped audit and README metadata checks passed. Doctor warned about duplicate executable resolution.
- Audit output blocked on `js-yaml` (high) and **@vitest/coverage-v8** (moderate, via vitest). This records the gate's current output, not a demonstrated runtime exploit; dependency remediation is not performed by this review.
- `rtk npm run lint`: passed (TypeScript, ESLint, line/function ceilings and generated status constants).
- `rtk python3 -m ruff check logics_manager tests/python scripts`: passed.
- `rtk npm test`: 87 test files, 986 tests passed, 131.10 seconds.
- `rtk python3 -m pytest tests/python/ -q`: 1,477 tests passed, 147.88 seconds.
- Strict Logics lint, grouped audit and index generation passed after capture. The full CI pipeline remains incomplete: coverage, compile, visual smoke and package gates were not completed by this review after the audit stop.
- Dependencies and risks: these changes would touch the Git selection contract, the repair endpoint's invalid-input behavior and optional cache handling. Preserve valid preview/apply behavior and JSON CLI output. No code fixes or dependency changes belong to this capture.

# Acceptance criteria
- AC1: A selected literal filename containing `*`, `?` or brackets cannot cause any unselected file to be staged or committed; the response matches the actual commit.
- AC2: Malformed repair JSON, invalid Content-Length and non-object bodies return a client error without changing any document; valid preview remains read-only and valid apply still repairs.
- AC3: Invalid cache shapes and timestamps do not crash update checks, interactive command dispatch or viewer update payloads; valid cache hits retain their existing behavior.
- AC4: Any accepted fix has a focused regression check reproducing the corresponding failure above. Dependency-gate failures are reported separately from behavior-test results.
- AC5: Starting from Project and adding a project may return the viewer to Activity, but the Activity / Project / Review selector immediately highlights Activity. Subsequent selections display and highlight the same surface. Verify this scenario in the browser; code-only checks are insufficient visual proof.
- AC6: After selecting a Fleet project-discovery root, discovering existing projects and marking favorites, reopening the viewer with `logics-manager view` restores that root, those projects and their favorite markers without manually resetting the root or re-entering favorites. Verify browser reopening and viewer-process restart separately under the same operator profile, with a focused persistence check and browser evidence.
- AC7: Confirm or refute F6 with a browser reproduction that records a relevant repository change, the configured refresh interval and Review content before and after reopening. If confirmed, demonstrate that the content refreshes while Review stays open; otherwise document the observed behavior and why no fix is needed.
- AC8: In both the Fleet root picker and the project-folder picker, the operator can understand the purpose of the selected folder, browse, confirm or cancel without unintended changes. Distinguish a discovery root from an individual project, with consistent navigation and purpose-specific confirmation copy. Validate both fallback flows visually, including keyboard navigation, focus and constrained viewports; cancellation leaves the active project and Fleet roots unchanged.

- AC9: With grouped Recent Activity entries and long chain titles, collapsed and expanded content stays within the available view width at desktop and constrained viewports, without page-level horizontal overflow or clipped controls. Verify DOM width measurements, keyboard expansion and browser screenshots; establish whether the group or an ancestor causes the defect.

# Definition of Ready (DoR)
- [x] Problem statement and operator impact are recorded for every finding.
- [x] Eight slices define scope, non-goals, priorities and investigation boundaries.
- [x] AC1-AC9 are mapped to backlog slices with executable validation scenarios.
- [x] Dependencies, browser evidence needs and the existing CI audit blocker are recorded.

# Companion docs
- Product brief(s): `prod_116_trustworthy_viewer_actions_and_persistent_project_navigation`
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer_git.py`
- `logics_manager/viewer.py`
- `logics_manager/update_check.py`
- `logics_manager/cli.py`
- `clients/viewer/src/browser-host/index.js`
- `tests/python/test_viewer_cli.py`
- `tests/python/test_cli_main.py`
- `scripts/ci-check.mjs`
- `scripts/check-npm-audit.mjs`

# Backlog
- `item_877_commit_only_literal_selected_git_paths`
- `item_878_reject_malformed_repair_requests_before_writing`
- `item_879_recover_safely_from_invalid_update_caches`
- `item_880_synchronize_the_surface_selector_after_adding_a_project`
- `item_881_restore_fleet_discovery_roots_and_existing_favorites_on_reopen`
- `item_882_investigate_review_refresh_while_the_surface_stays_open`
- `item_883_clarify_the_fleet_root_selection_experience`
- `item_884_contain_grouped_recent_activity_within_the_viewport`
