## item_732_make_the_commit_list_and_the_diff_pane_readable - Make the commit list and the diff pane readable
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 62%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 00:30:59

# AI Context
- Summary: The hash wraps mid-token, the title prints twice, the diff's first five lines repeat the selected card, filenames are truncated from the identifying end, the diff has no colour, and truncation offers no continuation.
- Keywords: commit hash wrapping, duplicate heading, diff metadata, diff colouring, diffstat truncation, file scoping, truncated diff
- Use when: Changing how a commit or a diff is rendered on the Git screen.
- Skip when: Replacing the diff source or adding a side-by-side diff mode.

# Problem
- The hash wraps mid-token, the title is printed twice, the diff's first five lines repeat the selected card, filenames are truncated from the end that identifies them, the diff has no colour, and a truncated diff offers no continuation.

# Scope
- In:
  - Render a hash as one unbroken token, and the screen title once.
  - Drop the commit metadata from the diff pane and colour additions, deletions and hunk headers.
  - Make a changed file identifiable, give it its change size, and let selecting it scope the diff.
  - Offer a way past a truncated diff.
- Out:
  - Replacing the diff source, and adding a side-by-side diff mode.

# Delivery notes
- **The diff pane shows the diff.** Every diff opened with `diff --git`, `index <blob>..<blob>`, `--- a/<path>` and `+++ b/<path>` -- the path the pane's own header already states and two hashes nobody reads. Five lines that pushed the actual change below the fold on a short pane. The render starts at the first hunk. Verified against the live corpus: `metaLines: 0`, first line `@@ -7517,209 +7517,220 @@`.
- Additions, deletions and hunk headers already had their classes and their colours; what hid them was the header above. The regression holds the classes, which is what a test can hold, and the stylesheet colours them.
- **A truncated diff offers the rest.** It reported the word `truncated` and nothing else. `git_file_preview_payload` in the same module has had a `full` escape hatch all along, so `git_diff_payload` takes the same one rather than inventing a second way to ask -- and `canForce` turns itself off once the forced ceiling is also hit, so the control never offers a continuation that returns what is already on screen.
- **A hash is one token.** `overflow-wrap: anywhere` on the row let a short hash break mid-token, which makes it unreadable and impossible to copy by eye.
- **A path is truncated from the front.** It was cut from the right -- the end that says which file it is. `direction: rtl` with `unicode-bidi: plaintext` puts the ellipsis at the front and keeps the basename.
- The change size per file was already there and is left alone; selecting a file already scoped the diff.
- **An extraction the gate forced, recorded because it costs more than it saves.** The three lines the `full` parameter took made `do_GET` grow, and the function-length gate refused it. The three content routes -- diff, commit diff, file preview -- moved into `_handle_git_content_get`, following the precedent `_handle_select_fleet_root_path_post` set in `do_POST`. A named function with a docstring is longer than the branches it replaces; what it buys is a `do_GET` that stopped growing.

# Acceptance criteria
- AC3: A hash is one token; the title appears once.
- AC4: The diff shows the diff, distinguishably, with a way past truncation.
- AC5: A changed file is identifiable, sized, and selectable to scope the diff.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: A hash is one token; the title appears once.
- request-AC4 -> This backlog slice. Proof: AC4: The diff shows the diff, distinguishably, with a way past truncation.
- request-AC5 -> This backlog slice. Proof: AC5: A changed file is identifiable, sized, and selectable to scope the diff.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
