## req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question - Make the Git, CI, Release and Settings screens answer their own question
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Git, CI, Release and Settings each hold the facts needed to answer the one question they are opened with, and none states the answer; this leads each with a verdict and its action, and fixes what the drilled-in states revealed.
- Keywords: git screen, commit diff, diffstat, ci run duration, release gates, gate vocabulary, settings state, destructive actions, verdict first
- Use when: Changing the Git, CI, Release or Settings screens, or how a run, gate or viewer state is reported.
- Skip when: Working on the fleet home, the board, the details panel, the activity feed, or the Workshop and CDX screens.

# Needs
- Requested by the operator, 2026-08-13: the Git, CI, Release and Settings screens deserve the same pass as the fleet home and the board, with mockups.
- The review with real captures of every screen, including the states reached by clicking into them, is in `logics/external/remote_settings_visual_review_2026_08_13.md`. The mockup this request delivers is `logics/external/mockup/remote_settings_redesign.html`.
- Each of these four screens exists to answer exactly one question -- can I push, did it pass, can I release, what is this viewer doing. In all four the facts needed to answer it are on screen and the answer itself is never stated.
- The operator also asked for the drilled-in states to be reviewed, not only the landing frames. That correction mattered: the first pass judged Git from its first frame and reached the wrong conclusion about its most valuable panel.

# Context
- **Shared across all four.** Each is a dismissable document panel with Refresh / Minimize / Close over a project board that bleeds around its edges -- the framing defect already tracked for the fleet home under `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`, and whatever is decided there should apply here once rather than four times. Each opens on a row of large tiles whose values are mostly constants or zeros. No screen shows a duration and every timestamp is an absolute US-format datetime. The string `completed / success` is printed verbatim, in link blue, twelve times across CI and Release. And the topbar `Remote` menu and the in-screen tab strip are two navigations to the same three screens.
- **Git is better than its first frame suggests, and lands on the wrong one.** `Changes` is the default domain and holds nothing on a clean tree, so both content panes open blank; `History` always has content and is one click away. Once a commit is selected the screen is dense and useful, and its three-pane shape is worth keeping. What is wrong inside it: `History` is printed twice, as an uppercase eyebrow and again as a 22px heading; the commit hash wraps mid-token -- one hash broken across two lines, another split after seven characters --, which stops it being readable or copyable; the diff pane's first five lines are the hash, author, date and message already shown on the selected card, so the first useful line is line 14; the diffstat truncates filenames from the left, removing the part that identifies them and keeping the part shared with their siblings; the diff has no colour at all, additions, deletions and hunk headers rendering in one grey; and the header says `truncated` with nothing offered to see the rest.
- **One Git domain is entirely redundant.** The `Remote` domain's whole content, dumped from the DOM, is `Tracking logics-manager/main` and `Ahead 5, behind 0`. Both are already printed verbatim in the tiles above it. Separately, the staged, worktree and untracked counts appear in the tiles and again in the domain rail, and `Clean` is given a large tile while `Ahead 5` -- five commits that exist nowhere but this machine -- is a small pill.
- **CI repeats itself and withholds the one number that matters.** `completed / success` appears on all six job rows, in link blue rather than a status colour, which leaves no room for the case that matters -- a job that failed, drawn today at exactly the size of one that passed. `pass` appears four times on the screen. Started and Updated are both printed and their difference is not, nor is any per-job duration, which is what tells a reader where to look. Job rows are not clickable; the only way further is `Open in GitHub`, which leaves.
- **Release holds every fact and answers nothing.** It shows `blocked` and `pass` side by side with evidence fully collected, and never reconciles them. The sentence that does -- `git_push: evidence targets a different commit (branch)` -- is a right-aligned value in a key/value row, at the same weight as the path to a JSON file. The blocking gate is described three ways at once: the tile says `BLOCKED GATE: git_push`, its pill says `stale`, its substate says `pushed`. It sits fifth of eight. Each gate costs about 100px, the substate under most is the gate's own name repeated, and the one substate carrying real information -- that the npm publication gate is optional -- is grey small text at the bottom.
- **Settings gives every action the same weight and reports no state.** Nine buttons, all primary: `Stop viewer`, which kills the server the operator is looking through, is drawn identically to `Insights`, a link to another screen. Three of the nine are navigation, not settings. The panel prints its own title twice, as the screen's eyebrow and heading and again in a full-width card beneath with a sentence under that. Nothing reports whether the MCP connector is on, or the port, bind address, or read-only mode -- all of which the CLI prints at startup.
- Out of scope: the fleet home (`logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`), the board, details panel and activity feed (`logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`), the Workshop and CDX screens, and the behaviour of the MCP connector itself.
- Known risk: this is the third request to depend on the panel-framing decision taken under `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`. It must not be re-decided here; these four screens inherit it.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host.

# Acceptance criteria
- AC1: Each of the four screens opens with a stated verdict -- whether the operator can push, whether the run passed, whether the release can proceed, what this viewer is -- placed where the largest tile is today, with the action that follows it beside it.
- AC2: The Git screen opens on a domain that has content, so the operator never meets two blank panes on a clean tree.
- AC3: A commit hash is rendered as one unbroken token wherever it appears, and the screen's title is printed once.
- AC4: The diff pane shows the diff: the commit metadata already carried by the selected card is not repeated, additions, deletions and hunk headers are distinguishable, and a truncated diff offers a way to see the rest.
- AC5: A changed file is identifiable from its displayed name, carries its own change size, and selecting it scopes the diff to that file.
- AC6: No count and no fact appears twice on the Git screen, and no navigation entry exists whose content is already shown elsewhere on the same screen.
- AC7: A run and each of its jobs report how long they took, and every time shown is relative with the absolute value available.
- AC8: Status is carried by colour and form rather than by a repeated string, on every job, gate and run row.
- AC9: A failing job or a blocking gate leads its screen and stays expanded; passing ones collapse to a summary line that states how many.
- AC10: The Release screen states in one sentence why a release is blocked when it is, reconciling the gate state with the run result and the evidence count rather than presenting all three unexplained.
- AC11: A gate is described by one word for its state; a gate that is optional says so where that changes the reader's conclusion; and the gates fit in a glance with the blocking one first.
- AC12: The Settings screen reports the state of what it configures -- at least this viewer's address, mode, transport and version, and whether the MCP connector is on.
- AC13: A control whose effect is binary is presented as a binary control showing its current position.
- AC14: A destructive action is visually distinct from a navigational one, states what it costs, and asks for confirmation.
- AC15: Settings contains settings; entries that navigate to another screen are reached from the navigation, not from Settings.
- AC16: All four screens hold at 1440x900, 820x1180 and 390x844 with no overlap, clipping or sideways scroll, and the viewer UI campaign covers each of them in the states an operator reaches by clicking into them -- not only their landing frames.
- AC17: Every change is made in the shared browser-host sources and rebuilt, and behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/git.js
- clients/viewer/src/browser-host/render.js
- clients/viewer/src/browser-host/index.js
- clients/viewer/viewer.css
- logics_manager/viewer.py
- scripts/build/build-viewer-browser-host.mjs
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- logics/external/remote_settings_visual_review_2026_08_13.md
- logics/external/mockup/remote_settings_redesign.html

# Backlog
- `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`
- `item_732_make_the_commit_list_and_the_diff_pane_readable`
- `item_733_say_each_git_fact_once`
- `item_734_report_a_ci_run_by_its_verdict_and_its_duration`
- `item_735_state_in_one_sentence_whether_the_release_can_proceed`
- `item_736_make_the_release_gates_readable_at_a_glance`
- `item_737_turn_settings_into_controls_with_state`
- `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`
