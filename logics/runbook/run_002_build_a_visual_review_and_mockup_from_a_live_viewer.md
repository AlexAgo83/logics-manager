## run_002_build_a_visual_review_and_mockup_from_a_live_viewer - Build a visual review and mockup from a live viewer
> Status: Active
> Category: validation
> Verified: 2026-08-13, produced the reviews and mockups behind req_344, req_345, req_347 and req_349
> Related request: (none yet)
> Related backlog: (none yet)
> Related task: (none yet)
> Reminder: Update status, category, verification, and linked refs when you edit this doc.

# Trigger
- A viewer screen is judged unclear, ugly, or hard to use, and the judgement needs to become something a request can be scaffolded from.
- A redesign is proposed and someone has to decide whether it is worth doing before any code moves.
- This is the design counterpart to `run_001_run_the_viewer_ui_campaign_before_a_delivery.md`: that runbook asks whether a screen is broken, this one asks whether it is any good, and produces the evidence either way.

# Prerequisites
- A local Chrome, reached only through the keychain-safe launcher pattern below. Never invoke the Chrome binary bare on macOS: a Keychain dialog during a capture is itself the defect, exactly as `run_001` states.
- A viewer that can be started on a chosen port, and a project with a real corpus. A synthetic corpus produces synthetic findings.

# Procedure
- **Capture the real screen, not a reading of the source.** Start the viewer on a spare port with `--no-open`, then drive Chrome over the debugging protocol. Reuse the launcher flags from `tests/run_local_viewer_visual_smoke.mjs`: `--use-mock-keychain --disable-features=DialMediaRouteProvider --headless=new --no-first-run --no-default-browser-check --user-data-dir=<throwaway>`, plus `--remote-debugging-port=0` and a `--window-size` per viewport. Sweep 1440x900, 820x1180 and 390x844 -- the campaign's three viewports, so findings are comparable.
- **Drive the screen, do not only open it.** This is the step that decides whether the review is worth anything. Click into every tab, domain and disclosure; select a row so the panes that depend on a selection are populated; scroll a list that is taller than the viewport. Capture each state. A screen judged from its landing frame produces confident findings about the wrong things -- on the Git screen the first pass concluded the diff pane was useless, when it was empty only because the screen opens on its empty domain.
- **Wait for the screen, and prove which one you captured.** Some screens take twenty seconds or more against a large corpus -- Corpus insights, Validation health and Getting Started all did. A capture taken seven seconds after the click returned the *previous* screen with `Loading insights...` in the meta line, and it would have been reviewed as the real thing. Read the document title into every dump (`document.querySelector('#viewer-document-title')?.textContent`) so each capture states which screen it is, and raise the wait until the titles are right. A capture that cannot name itself is not evidence.
- **Dump the text, not just the pixels.** Alongside each capture, evaluate `element.innerText` for the region under review and save it. A panel whose entire content is a title, a path, the same slug twice and seven collapsed headings is a far stronger finding as seventeen lines of text than as a screenshot, and it can be quoted verbatim in the request.
- **Measure the claim before making it.** Anything of the form "this value never varies" or "most of this screen is finished work" is checkable against the corpus or the payload in a few lines of Python. Two examples that carried their requests: 34% of 1 393 documents share one identical metric chip and 100% sit above 85, and 1 382 of 1 511 documents are Done -- 91.5%. A measured number survives disagreement; an adjective does not.
- **Check what the payload already carries.** Before proposing a fact be shown, confirm the screen already receives it. Most findings turn out to be rendering, and saying so keeps a request from being estimated as backend work. Say plainly which few items are not, and make settling them the first backlog item.
- **Write the mockup as one self-contained HTML file**, current and proposed side by side, in `logics/external/mockup/`. Inline the CSS, use the viewer's own colour roles, and mark it as a static mockup so nobody mistakes it for a prototype. Put the real captures beside it under the same prefix, and reference them from the review.
- **Give every proposal its reason.** A grid of short "what changes, and why" cards, one per change, each naming the defect it answers. A proposal without its reason cannot be argued with, and will be re-litigated during delivery.
- **Render the mockup through the same launcher and read it.** A mockup that has not been looked at has the same status as a screen that has not been driven.
- **Write the review as prose in `logics/external/`**, findings ordered by what they cost the reader, with a scope note separating rendering from anything needing new data. The review is what the request's `# Context` is written from.
- **Correct in place when driving proves the first reading wrong**, and say so in the review. The correction is usually the most valuable paragraph in it.

# Verification
- Every finding names what was measured or quotes what was captured. A finding that rests only on taste is either dropped or stated as taste.
- Every proposal names the finding it answers.
- The proposal's scope note says which parts are rendering and which are not, and the not-rendering parts are the first thing the delivery settles.
- The mockup covers every state the review discusses, including the drilled-in ones and the phone width -- a proposal shown only at 1440 has not been checked.
- Every capture names the screen it holds. A review written from a capture that could be the previous screen is not a review.
- `logics/external/**` is gitignored by design, so reviews and mockups stay local. What is versioned is the request chain scaffolded from them; the request must therefore quote enough of the evidence to stand on its own.

# Rollback
- Not applicable: this produces documents and captures, and mutates nothing. Stop the viewer and delete the throwaway Chrome profile when finished.

# References
- Related request: (none yet)
- Related backlog: (none yet)
- Related task: (none yet)
- Companion runbook: `logics/runbook/run_001_run_the_viewer_ui_campaign_before_a_delivery.md`
- Worked examples: `logics/external/fleet_home_visual_review_2026_08_13.md`, `logics/external/board_activity_visual_review_2026_08_13.md`, `logics/external/remote_settings_visual_review_2026_08_13.md`, `logics/external/insights_health_onboarding_visual_review_2026_08_13.md`
