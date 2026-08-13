## item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict - Open the Git screen on content and lead it with a verdict
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `Changes` is the default domain and is empty on a clean tree, so the screen opens with two blank panes while the one actionable fact -- five unpushed commits -- is a small pill beside a large `Clean` tile.
- Keywords: git default domain, empty landing state, ahead count, verdict first, tile strip
- Use when: Changing which Git domain opens first, or what the Git screen leads with.
- Skip when: The panel framing, and git operations the screen does not already offer.

# Problem
- `Changes` is the default domain and is empty on a clean tree, so the screen opens with two blank panes -- while `Ahead 5`, the one fact that needs acting on, is a small pill beside a large `Clean` tile.

# Scope
- In:
  - Choose the opening domain from what the repository actually has.
  - State the verdict where the largest tile is today, with the action beside it.
  - Compress the tile row into a strip that keeps the facts without setting the scale of the screen.
- Out:
  - The panel framing, inherited from item_711.
  - Performing git operations the screen does not already offer.

# Acceptance criteria
- AC1: The screen opens with a stated verdict and the action that follows it.
- AC2: It opens on a domain that has content.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The screen opens with a stated verdict and the action that follows it.
- request-AC2 -> This backlog slice. Proof: AC2: It opens on a domain that has content.

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
