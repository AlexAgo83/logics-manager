## req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print - Make the corpus, health and onboarding screens earn the numbers they print
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Insights prints a total beside its own component and counts fresh scaffolds as defects; Health shows 87 warnings of which one is contradicted by the filesystem; Getting Started sets prose at a 110-character measure and ignores the project it describes.
- Keywords: corpus insights, validation health, getting started, signal classification, findings grouping, reading measure, per-stage counts, slow loading screens
- Use when: Changing Corpus insights, Validation health or Getting Started, or how workflow signals and validation findings are presented.
- Skip when: The audit rules themselves, Workshop and the CDX family, or the board, fleet home, panel, activity and Remote screens.

# Needs
- Requested by the operator, 2026-08-13, after asking which viewer screens were still unreviewed: Corpus insights, Validation health and Getting Started, with Workshop and the CDX family deliberately left aside.
- The review with real captures at two viewports, each screen driven and scrolled, is in `logics/external/insights_health_onboarding_visual_review_2026_08_13.md`. The mockup this request delivers is `logics/external/mockup/insights_health_onboarding_redesign.html`.
- These three are not the same kind of problem as the four screens reviewed before them. Corpus insights already leads with a verdict sentence, and Getting Started is the best-written text in the product. What is wrong is arithmetic that does not reconcile, a findings list that cannot be trusted, and prose set at a width nobody can read.
- Two of the three need less work than any screen reviewed so far.

# Context
- **Corpus insights prints a total and one of its own components as peers.** `NEEDS ATTENTION 96` and `QUALITY FINDINGS 87` sit as equal tiles, while the Operator actions immediately below read 7 + 2 + 87 = 96. The second tile is a component of the first and the screen never states the relationship, so the reader is invited to add them.
- **Worse, the documents it flags are not defects.** Every document listed under Flow health was a request chain scaffolded within the previous hour, reported as an incomplete workflow chain and a promotion gap -- which is exactly what a freshly scaffolded request is. The screen counts the normal state of new work as something needing attention, which is what makes the headline number unusable rather than merely imprecise.
- **Validation health reports 87 warnings of which at least one is false.** Its findings list shows five entries from the same file, with the file path printed identically five times in link blue as the row title and the actual finding demoted to a second line. One of them states that a document `was not found anywhere in the repository` for a document that exists on disk. Whether the rule or its search scope is at fault is an audit question and not this request's; the effect on the screen is that 87 warnings of unknown reliability teach the operator to stop reading them.
- **Validation health also restates an answer it does not own.** Five tiles, three of them zero, and `RELEASE READY: No` last with no reason on a screen where everything else is green -- while the release gate already answers that on the Remote Release screen, in a different vocabulary. And `Apply fixes` is a single primary button over 87 findings with no count of what is fixable and no preview, though it edits documents.
- **Getting Started's content is good and its layout prevents reading it.** The intro line runs about 110 characters at 1440 where comfortable reading is 45 to 75; this is the only screen in the viewer that is mostly prose. The column is pinned left with the right third empty while four stages stack into a long scroll. Nothing states how many stages there are or where the reader is. Stage 1 offers `New Request`, stage 2 offers nothing, and `Open Health` appears twice under different stages.
- **And the guide does not know the project it is describing.** A corpus of 1 555 documents gets the same first-run guide as an empty one, though the screen already has the counts that would let it say which stages this project has clearly passed.
- **A method note that belongs in the delivery.** All three screens load slowly enough that a capture taken seven seconds after the click returns the previous screen with `Loading insights...` in the meta line. Any check written against them must wait for the screen it means to assert on, and prove which screen it captured. This is recorded in `logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md`.
- Out of scope: Workshop and the CDX family, excluded by the operator; the audit rules themselves; and the four screens covered by the other viewer requests. Note that `CDX status` already implements several of the patterns proposed across these reviews and is worth treating as a reference rather than a target.
- Known risk: separating what needs a decision from what is the normal state of work in flight requires a rule for which signals are which. That is a product decision, not a layout one, and drawing the screen before it is settled would encode a guess.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host.

# Acceptance criteria
- AC1: Which workflow signals indicate a defect and which are the expected state of work in flight is decided and recorded, so a screen can group them without guessing.
- AC2: Corpus insights distinguishes what needs a decision from what is simply in flight, and its headline counts only the former.
- AC3: No screen presents a total and one of its own components as peer figures; where a number is the sum of others, the relationship is legible.
- AC4: A document listed under a health signal states which signal listed it.
- AC5: Corpus insights uses one visual language per card, and reuses the per-stage colours the board already uses rather than a single colour for every stage.
- AC6: Validation health leads with the verdict it owns, and points at the release gate rather than restating an answer that belongs to another screen in another vocabulary.
- AC7: Findings are grouped by the file they belong to, with the finding as the row's headline and the path as its context.
- AC8: A finding contradicted by the repository itself is visible as suspect on the screen rather than left for the reader to discover.
- AC9: An action that modifies documents states how many it would change and allows the change to be inspected before it is applied.
- AC10: Prose is set at a readable measure, and the width that frees carries the screen's own navigation rather than nothing.
- AC11: Getting Started states how many stages it has and where the reader is in them, and every stage ends in an action, with no action offered twice.
- AC12: Getting Started reports what this project already has at each stage, so it orients an established corpus rather than only introducing an empty one.
- AC13: All three screens hold at 1440x900, 820x1180 and 390x844, with what is a column on a wide screen becoming a subordinate line on a phone.
- AC14: The viewer UI campaign covers all three, waiting for each screen to finish loading and proving which screen it captured rather than asserting on whatever is on screen.
- AC15: Every change is made in the shared browser-host sources and rebuilt, and behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/viewer.css
- logics_manager/viewer.py
- scripts/build/build-viewer-browser-host.mjs
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- logics/external/insights_health_onboarding_visual_review_2026_08_13.md
- logics/external/mockup/insights_health_onboarding_redesign.html
- logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md

# Backlog
- `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`
- `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`
- `item_748_give_corpus_insights_one_visual_language`
- `item_749_lead_validation_health_with_the_verdict_it_owns`
- `item_750_group_the_findings_and_flag_what_the_repository_contradicts`
- `item_751_say_what_applying_fixes_would_change`
- `item_752_give_getting_started_a_reading_measure_and_a_position`
- `item_753_make_getting_started_reflect_the_project_in_front_of_it`
- `item_754_cover_the_three_screens_including_how_slowly_they_load`
