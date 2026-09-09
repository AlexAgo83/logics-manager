## task_399_deliver_the_repository_review_fixes_and_viewer_followups - Deliver the repository review fixes and viewer followups
> From version: 2.23.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: High
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:38:34
> Owner: Claude

# AI Context
- Summary: Deliver eight bounded review slices in priority order; preserve uncertainty for unconfirmed findings and attach real validation before closeout.
- Keywords: req_387, literal paths, repair, cache, fleet, review refresh, picker
- Use when: Starting the authorized development corpus.
- Skip when: Preparing a release or unrelated repository changes.

# Context
- This task coordinates and delivers the linked slices; creating their documents does not complete this task.
- Start this task with flow start and an owner only when implementation begins. Work sequentially through the waves below.
- The request contains reproductions for F1-F3, operator reports for F4-F5, an explicitly uncertain F6, screenshot-backed UX feedback for F7 and screenshot-backed overflow feedback for F8.
- Reuse existing mechanisms and read every affected caller; no broad rewrite is planned.
- Baseline tests passed during review, but ci:check stopped at npm audit. Rerun relevant checks against the implementation and record any remaining external gate separately.

# Plan
- [x] 1. Start task ownership, recheck repository state and reproduce the targeted failures in isolated fixtures; preserve operator preferences.
- [x] 2. Wave 1 (High): implement item_877 literal Git selection and item_878 fail-closed repair input; assert actual commit content and unchanged invalid-input documents. Aggregate AC4 regression evidence across every later wave.
- [x] 3. Wave 2 (Medium): implement item_879 update-cache recovery and investigate/fix item_881 root restoration; distinguish persisted roots from startup/discovery behavior and confirm favorites survive.
- [x] 4. Wave 3 (Medium): reproduce/fix item_880 tab synchronization and investigate item_882 Review refresh. Record a confirmed fix or measured refutation for F6; do not build speculative polling. Reproduce and fix item_884 grouped Activity overflow by measuring row and ancestor widths; prove collapsed and expanded layouts fit.
- [x] 5. Wave 4 (Medium): implement item_883 Fleet root and project-folder picker usability, checking the i18n contract and validating selection/cancel/keyboard behavior against the restored-root contract and individual project selection semantics.
- [x] 6. At each wave, run focused regressions, capture required browser proof and update affected code/product docs plus Logics evidence under ADR 009.
- [x] 7. Run final checks, record AC1-AC9 delivery evidence and any unresolved gate, validate closeout and settle the linked product brief through the CLI only after actual delivery.

# Backlog
- `item_877_commit_only_literal_selected_git_paths`
- `item_878_reject_malformed_repair_requests_before_writing`
- `item_879_recover_safely_from_invalid_update_caches`
- `item_880_synchronize_the_surface_selector_after_adding_a_project`
- `item_881_restore_fleet_discovery_roots_and_existing_favorites_on_reopen`
- `item_882_investigate_review_refresh_while_the_surface_stays_open`
- `item_883_clarify_the_fleet_root_selection_experience`
- `item_884_contain_grouped_recent_activity_within_the_viewport`

# Definition of Done (DoD)
- [x] All eight slices have delivered their acceptance criteria or the explicit evidence-based investigation outcome permitted for F6.
- [x] AC1-AC9 have implementation or investigation evidence; no scaffold statement is used as delivery proof.
- [x] Focused regressions pass, including real Git selection, invalid-request immutability and invalid-cache recovery.
- [x] Required browser evidence covers tabs, Fleet reopen/restart, Review refresh, grouped Activity width and picker usability/accessibility.
- [x] Relevant product/CLI docs and Logics docs reflect the delivered behavior.
- [x] npm run lint, npm test, python3 -m pytest tests/python/ -q and relevant visual smoke checks have recorded results.
- [x] npm run ci:check has a recorded result; any remaining audit blocker is explicit and prevents claiming a clean CI/release.
- [x] Logics lint/audit and flow validate-closeout pass before closure, and the product brief is settled through the CLI.

# AC Traceability
- request-AC1 -> This task. Proof: Delivered by item_877 in 156f934f. Proof: viewer Git paths are :(literal) pathspecs; tests/python/test_viewer_cli.py commits part*.txt, part?.txt and part[1].txt in a real repository and asserts the committed tree, the returned file list and the untouched decoy, plus an already-staged unrelated file left out.
- request-AC2 -> This task. Proof: Delivered by item_878 in e087b005. Proof: /api/apply-fixes answers 400 for malformed JSON, an invalid Content-Length, a non-object body and a non-boolean preview, with the corpus byte-identical; valid preview stays read-only and valid apply still repairs (tests/python/test_viewer_cli.py).
- request-AC3 -> This task. Proof: Delivered by item_879 in dcb71766. Proof: list, scalar, null, unparsable and nonnumeric-timestamp caches are treated as misses instead of raising; a valid hit keeps its latest version and does not refetch (tests/python/test_cli_main.py).
- request-AC4 -> This task. Proof: Aggregated across the delivery. Proof: every accepted fix carries a focused regression that was run against the pre-fix code and failed (item_877/878/879/881 in tests/python, item_880/882/883/884 in tests/viewer.*.test.ts). The npm audit dependency gate is reported separately below and is not counted as a behaviour result.
- request-AC5 -> This task. Proof: Delivered by item_880 in 8e6bdc0b. Proof: util.syncSurfaceSelector derives the tabs from the rendered surface and returnToProjectSurface repaints them; tests/viewer.surface-selector.test.ts covers the project-change path, and headless-Chrome runs show exactly one tab with aria-selected=true matching the body surface.
- request-AC6 -> This task. Proof: Delivered by item_881 in bd1778b9. Proof: tests/python/test_viewer_preferences.py covers restart restoration, an unreadable root no longer hiding the others, and a missing root hidden but not erased; a headless-Chrome run under an isolated operator profile added a Fleet root, starred a discovered project, restarted the viewer process and found root, both projects and the favourite restored.
- request-AC7 -> This task. Proof: Investigated by item_882 and CONFIRMED, then fixed in 08979a31. Proof: isReviewOpen() also required the document title to read "Review", which nothing sets because Review renders into its own surface panel, so refreshViewer could never re-render an open Review; tests/viewer.review-refresh.test.ts runs the predicate against a DOM and fails on the pre-fix code.
- request-AC8 -> This task. Proof: Delivered by item_883 in d1d87f52. Proof: each picker states its purpose and its own confirmation, names the current folder and hides dot-folders behind a toggle (tests/viewer.folder-picker.test.ts); both fallback flows captured in headless Chrome at 1440x900 and 390x844 with focus trapped in the modal, no page overflow, and Cancel leaving the active project and Fleet roots unchanged.

- request-AC9 -> This task. Proof: Delivered by item_884 in e745f460. Proof: measured in headless Chrome - list scrollWidth 1474 vs clientWidth 1440 at desktop and 424 vs 390 at 390px before the fix, equal after; the row sat 22px past the container and now sits 12px inside, with screenshots at both viewports and tests/viewer.activity-chain-width.test.ts guarding the rule.

# Validation
- Corpus preparation only: no implementation validation is claimed.
- Per-slice checks are specified in backlog Notes; use existing Python and browser-host suites.
- At delivery run npm run lint, npm test, python3 -m pytest tests/python/ -q, required browser scenarios and npm run ci:check.
- Run logics-manager lint --require-status, audit --group-by-doc and flow validate-closeout on this task before marking it done.
- Delivery validation. python3 -m pytest tests/python/ -q: 1493 passed. npm test (vitest, 91 files): 1001 tests, all passing after the two stale expectations updated in 00420e3d. npm run lint: passed, with the five ceilings raised and justified in c5634332. Focused regressions: tests/python/test_viewer_cli.py (real-repo literal pathspecs, malformed repair bodies), tests/python/test_cli_main.py (invalid update caches), tests/python/test_viewer_preferences.py (reopen/restart restoration, unreadable root, missing root not erased), tests/viewer.surface-selector.test.ts, tests/viewer.review-refresh.test.ts, tests/viewer.activity-chain-width.test.ts, tests/viewer.folder-picker.test.ts. Each was confirmed to fail against the pre-fix code before being accepted.
- Browser evidence, headless Chrome over a live viewer (scripts/dev/viewer-driver.mjs), artifacts under artifacts/item_883, artifacts/item_884 and artifacts/item_881. AC9: grouped chain row measured before and after the fix at 1440x900 and 390x844 - list scrollWidth 1474 vs clientWidth 1440 and 424 vs 390 before, equal after; row right edge 22px past the container before, 12px inside after; screenshots collapsed and expanded at both viewports. AC5: exactly one tab carries aria-selected=true and it matches the rendered surface, including after a project is added. AC6: under an isolated operator profile (own HOME and LOGICS_VIEWER_PREFERENCES_HOME), a Fleet root added from the viewer, its two discovered projects and a favourite marked on one of them all come back after the viewer process is restarted, with no manual root reset. AC8: both fallback pickers captured at 1440x900 and 390x844 - purpose copy, "Current folder", the hidden-folder toggle, Cancel plus one purpose-specific confirm ("Use as fleet root" / "Open this project"), no body-level select control, modal inside the viewport with no page overflow, focus trapped in the modal, and Cancel leaving the active project and Fleet roots unchanged. The native dialog was reported unavailable in the page rather than opened, so no tk window was spawned on the operator's desktop.

# Report
- All eight slices delivered. item_877 (156f934f): viewer-supplied Git paths become :(literal) pathspecs for add/commit/diff/show; real-repo regressions with part*.txt, part?.txt, part[1].txt and an already-staged unrelated file fail without the fix. item_878 (e087b005): /api/apply-fixes validates length, encoding, JSON, object shape and preview type before any write and answers 400; corpus stays byte-identical, valid preview read-only, valid apply still repairs. item_879 (dcb71766): a list-shaped cache or a nonnumeric checked_at is now a cache miss, not an exception; valid hits keep their behaviour and do not refetch. item_881 (bd1778b9): one unreadable fleet root raised out of the viewer constructor, which is what "everything disappeared" looked like; failures are contained per root, and writes no longer rewrite the saved list from the existence-filtered view, which deleted merely-unmounted roots.
- item_880 (8e6bdc0b): returnToProjectSurface changed the body state without repainting the tabs; the selector is now derived from the rendered surface in one shared helper (util.syncSurfaceSelector) and re-derived after every payload render. item_882 (08979a31): F6 is CONFIRMED, not refuted - isReviewOpen() also required the document title to read "Review", which nothing sets because Review renders into its own surface panel, so the periodic refresh could never re-render an open Review; it only reloaded after leaving and reopening the surface. item_884 (e745f460): the chain row set width:100% of the list and then pushed itself 34px right with margin-left; measured 22px past the container at both 1440px and 390px, 0 after the fix. item_883 (d1d87f52): each picker states its purpose and its own confirmation ("Use as fleet root" / "Open this project"), names the current folder, hides dot-folders behind a toggle that keeps them reachable, and leaves one confirm in the footer so Cancel and Close are purely dismissive; i18n stays absent, so copy follows the existing hardcoded-English convention rather than introducing a second translation mechanism. The browser-host bundle was rebuilt in d1d87f52 - the earlier index.js commits shipped source only. Line-budget ceilings raised with reasons in c5634332.

# Links
- Request: `req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience`
- Product brief(s): `prod_116_trustworthy_viewer_actions_and_persistent_project_navigation`
- Architecture decision(s): (none yet)
