## item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict - Open the Git screen on content and lead it with a verdict
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 00:08:37

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

# Delivery notes
- **The opening domain was `changes` in three places, and the one that won was the one nobody would look at.** The markup marked the first domain active, `applyGitDomain(previous.domain || "changes")` overrode it on restore, and `previous` was itself initialised to `{ domain: "changes" }` on a fresh open. Fixing only the markup changed nothing, which is how a defect survives a plausible fix. The render now chooses from what the repository holds, a fresh open has no opinion so that choice stands, and a preserved view still keeps the operator's own domain.
- **The verdict states both facts when both are true.** Measured on this repository: 42 commits ahead *and* 5 files changed. The first version said only "5 files changed, none staged" and hid the 42 -- the screen's question is what can be done now, and those 42 are pushable while the changes are not part of them. It reads "42 commits ready to push. 5 files changed here are not part of them." with Push beside it.
- The verdict's action clicks the control the Actions menu already owns rather than performing the operation itself. A second push path would be a second place to change when push changes.
- The tone differs by border style as well as colour -- solid for ready, double for attention, dotted for clean -- so the three states survive greyscale, which is the condition `req_352` holds every redesign to.
- The tiles keep their facts and lose their scale: the row is a strip under the verdict rather than the first thing the eye lands on.
- Found by the full suite rather than by this slice: `item_723`'s day-header test asserted the literal string `Today` on entries three minutes old, so a run crossing midnight failed on the clock rather than on the code. It asserts that the entries share one header, whatever it is named.

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
