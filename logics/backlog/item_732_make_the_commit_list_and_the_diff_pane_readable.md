## item_732_make_the_commit_list_and_the_diff_pane_readable - Make the commit list and the diff pane readable
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 37%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
