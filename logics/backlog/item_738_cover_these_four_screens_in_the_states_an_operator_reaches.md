## item_738_cover_these_four_screens_in_the_states_an_operator_reaches - Cover these four screens in the states an operator reaches
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 37%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:52:34

# AI Context
- Summary: The campaign reaches these screens' landing frames only -- the same shape of gap as driving `view` but never `view --fleet`, and the same mistake the review's own first pass made about the Git diff pane.
- Keywords: campaign coverage, clicked-into states, git domains, selected commit, scrolled gates, expanded settings, baseline before redraw
- Use when: Extending the campaign to these four screens or to any state behind a click.
- Skip when: Adding new check kinds beyond what the layout checks already provide.

# Problem
- The campaign reaches these screens' landing frames only. The review's first pass made the same mistake and reached a wrong conclusion about the Git diff pane from its first frame -- which is the same shape of gap as the campaign driving `view` but never `view --fleet`.

# Scope
- In:
  - Reach the states behind a click: each Git domain, a selected commit and file, a scrolled gate list, an expanded Settings.
  - Apply the existing layout checks to each, at the three viewports.
  - Do this before the redraws, so the checks observe the change.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Delivery notes
- **Delivered before the redraws**, which is what this slice asked for and what `item_725` did not manage. The checks were written against the screens as they are, so they will observe the redesigns rather than be written around them.
- Six surfaces added, each a state behind a click: the Git screen, its History domain, the CI screen, the Release screen and the Settings screen. History is the domain the review's own first pass reached a wrong conclusion from, so it is the one worth standing in. 238 checks pass across the three viewports.
- **A finding, before any redraw: Git, CI and Release all render into the document panel under the title `Remote`.** Three screens with one name. The campaign cannot tell them apart by title, so each is proved by markup only it produces -- `.viewer-git__domain`, `.viewer-ci__list`, `.viewer-release__gates`. This is the AC1 and AC3 problem showing up in the harness before it was designed for, and when those are fixed the title proof should replace the markup proof.
- The surface visitor gained a `titleContains` option for screens that share a container, because a visible selector alone would let a check pass while standing on the previous screen -- the exact failure `run_002` records. It is unused for now, since these three cannot be told apart by title yet.
- Coverage proven load-bearing by renaming `data-viewer-git-domain` in the renderer and watching both Git surfaces fail.

- **The intermittent failure this campaign kept producing was the harness, not the product.** `Action unavailable while another viewer action is running` appeared on four runs across all three viewports, which is a pattern rather than noise: the campaign was clicking into a refusal because a previous action had not finished. The body carries `data-viewer-busy` for exactly this, and the visitor waits for it now. Four green runs since.
- **Observed and left alone, for whoever revisits `req_346`'s AC3:** that refusal is reported through `setMeta`, into the subtitle that `scheduleNextAutoRefresh` rewrites on every tick -- the same place `item_727` moved action *failures* out of, in the one branch it did not touch. An operator who clicks twice gets an explanation that disappears. It is not changed here because a refusal to start is transient and self-resolving, so a banner that stays until dismissed may be worse than the subtitle; that is a judgement about noise, not a defect to fix in passing.

# Acceptance criteria
- AC16: All four screens are covered in their clicked-into states at the three viewports.
- AC17: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC16 -> This backlog slice. Proof: AC16: All four screens are covered in their clicked-into states at the three viewports.
- request-AC17 -> This backlog slice. Proof: AC17: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

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
