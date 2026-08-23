## req_381_add_a_review_slot_for_project_change_timelines - Add a Review slot for project change timelines
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 94%
> Confidence: 86%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 13:29:27

# AI Context
- Summary: Adds a Review viewer slot that turns local Git changes into a horizontal burst timeline with vertical per-file review and a shared diff pane.
- Keywords: add, review, slot, project, change, timelines
- Use when: planning or implementing the dedicated Review surface for working-tree and commit-file diffs in the viewer.
- Skip when: changing Git mutation actions, remote provider integrations, or the existing Activity feed without adding the Review slot.

# Needs
- The viewer needs a first-class `Review` slot beside the existing project and activity surfaces, focused on reading what changed in the project.
- The Review slot should show change bursts over time horizontally, starting with the working tree and recent Git commits.
- Selecting a burst should show the files changed in that burst vertically, and selecting a file should show the relevant diff in the main pane.
- Keyboard navigation should match the mental model: left and right move across bursts; up and down move across files inside the selected burst.
- The first version should reuse local Git data and existing diff rendering rather than introducing a custom change event store.
- The UI must make the review path obvious without instructional copy: timeline position, selected burst, selected file, and diff context should be visible from structure and labels.

# Context
- The Git cockpit already has most of the raw behavior: the `git-status` viewer route returns dirty working-tree groups and recent commits, `git-diff` returns bounded file diffs, `git-file-preview` handles no-diff previews, and `git-commit-diff` returns bounded commit diffs.
- The existing History panel previews a whole commit diff. The proposed Review screen changes the navigation model: a horizontal timeline of bursts, a vertical file list for the selected burst, and a single diff pane.
- The first burst should be a synthetic `Uncommitted changes` item whenever the working tree is dirty. Later bursts should be recent commits from the current local repository.
- For the MVP, a burst is either the working tree or one commit. Session-level live batches, filesystem watchers, branch graphs, PR review, remote provider APIs, and persistent review history are explicitly later work.
- The implementation should keep all Git operations read-only, bounded, and safe for non-repository projects, matching `viewer_git.py` conventions.
- The shared viewer host serves both the standalone viewer and the VS Code embedded viewer, so source changes must be made under `clients/viewer/src/browser-host/` and rebuilt.
- Surface-control reality: what the docs call the Activity/Project switcher is not a multi-choice control. It is a 40x20 pill slider (`#activity-toggle`, `.toolbar__view-slider`) whose knob is a `::after` translated 20px on `data-current-mode="project"`, backed by a boolean: `activityPanelIsOpen()` plus the body classes `viewer-screen-activity` and `viewer-screen-project`. Seventeen call sites across `index.js`, `render.js`, `git.js`, `util.js`, and `viewer.css` read that boolean, including `returnToProjectSurface()`. A third surface therefore replaces the widget with a segmented three-choice control and migrates the boolean to a tri-state; it does not extend anything that already exists.
- UX decision: `Review` belongs with the Activity/Project surface switcher, expanding the current two-state control into a three-choice surface control. If the phone breakpoint cannot fit all three choices inline, it should use the existing topbar menu/sheet pattern rather than wrapping into a bulky grid.
- UI decision: desktop Review is a three-region work surface: a horizontal burst rail at the top, a vertical file column at the left, and the diff pane as the primary reading area. Tablet keeps the rail on top and stacks the file list beside/above the diff only as far as space allows. Mobile keeps one page scroll axis, with the burst rail horizontally scrollable inside its own region and files above the diff.
- Selection decision: the selected burst and selected file must each have a visible non-colour cue, `aria-current` or equivalent state, and stable dimensions so badges, long paths, hover states, or loading text do not resize the layout.
- Empty-state decision: clean repositories should show a compact `Nothing to review` state with the latest commit context if available; unavailable Git and non-repository projects should name the unavailable capability, not render an empty pane.

# Acceptance criteria
- AC1: The two-state slider is replaced by a three-choice Activity/Project/Review control and every reader of the old boolean surface state moves to the tri-state, with Review reachable at desktop, tablet, and phone widths without displacing Workshop, Remote, CDX, Corpus, Settings, or Diagnostics access.
- AC2: Opening Review in a Git repository shows a horizontal burst timeline with `Uncommitted changes` first when the working tree is dirty, followed by recent commits in reverse chronological order.
- AC3: Selecting a burst shows a vertical list of files changed in that burst, including path, change kind, and line change counts when Git reports them.
- AC4: Selecting a working-tree file renders the existing bounded working-tree or staged diff/file preview in the main diff pane.
- AC5: Selecting a committed file renders only that file's diff for the selected commit, not the whole commit patch, using the existing code viewer styling.
- AC6: Left/right keyboard navigation moves between bursts; up/down moves between files; focus and selected states remain visible and screen-reader labels identify the selected burst and file.
- AC7: Empty, clean, missing Git, non-repository, Git command failure, and oversized diff states render concise messages without breaking the viewer.
- AC8: Review data refreshes when the existing viewer refresh path updates Git status, and it does not add a second polling loop or a custom persistence layer.
- AC9: The Review layout holds at 1440x900, 820x1180, and 390x844 without overlap, clipped labels, or horizontal page scroll.
- AC10: Review is included in the local viewer visual campaign or equivalent layout harness, proving no blank surface, sibling-control overlap, viewport clipping, horizontal page scroll, missing heading structure, silent disabled action, or colour-only state at 1440x900, 820x1180, and 390x844.
- AC11: Backend and browser-host tests cover burst construction, committed-file diff payloads, working-tree selection, keyboard navigation, and unavailable-state rendering.
- AC12: The generated browser host bundle is updated and `npm run bundle:viewer-host`, `npm run check:viewer-host`, targeted vitest/pytest checks, the visual campaign target, and `logics-manager lint --require-status` pass.
- AC13: Review arrow-key navigation is scoped to the active Review screen: it does not fire while a modal is open or while focus is in a text field, and the existing document-level viewer keyboard shortcuts keep working.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/index.html` defines the current topbar screen slots and grouped navigation menus.
- `clients/viewer/src/browser-host/index.js` owns the viewer screen router, shared state, activity panel, and capability controls.
- `clients/viewer/src/browser-host/git.js` already renders Git status, working-tree file diffs, recent commits, commit diff loading, and active file/commit selection.
- `logics_manager/viewer_git.py` already exposes bounded, read-only Git status, file diff, file preview, and commit diff payloads.
- `logics_manager/viewer.py` registers the viewer HTTP routes, including the three Git endpoints named in the Context above; a new Review payload route is added to that route table and re-exported the same way.
- `clients/viewer/index.html` line ~212 holds `#activity-toggle`, and `clients/viewer/viewer.css` line ~632 holds `.toolbar__view-slider`: the widget AC1 replaces.
- `clients/viewer/src/browser-host/render.js` provides the shared code viewer and activity rendering helpers.
- `tests/viewer.browser-host.test.ts`, `tests/viewer.render.test.ts`, and `tests/python/test_viewer_cli.py` cover the browser host and viewer Git payloads.

# Backlog
- `item_857_expose_review_bursts_from_local_git`
- `item_858_build_the_review_slot_timeline_ui`
