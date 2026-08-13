## prod_085_numbers_a_screen_can_defend - Numbers a screen can defend
> Date: 2026-08-13
> Status: Proposed
> Related request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
> Related backlog: `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`, `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`, `item_748_give_corpus_insights_one_visual_language`, `item_749_lead_validation_health_with_the_verdict_it_owns`, `item_750_group_the_findings_and_flag_what_the_repository_contradicts`, `item_751_say_what_applying_fixes_would_change`, `item_752_give_getting_started_a_reading_measure_and_a_position`, `item_753_make_getting_started_reflect_the_project_in_front_of_it`, `item_754_cover_the_three_screens_including_how_slowly_they_load`
> Related task: `task_346_deliver_the_corpus_health_and_onboarding_screens`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
A dashboard is trusted or ignored, and it decides which within about two readings. A count that mixes defects with the normal state of new work, a total printed beside its own component, and a finding contradicted by the filesystem all teach the same lesson: do not rely on this screen. These surfaces already have the right instincts; what they need is for their numbers to survive being checked.

```mermaid
flowchart TB
    N[A headline number] --> C{Can the reader check it?}
    C -- no --> Ign[The screen is ignored]
    C -- yes --> Sum[Its components are visible]
    Sum --> Split{Defect or work in flight?}
    Split -- defect --> Act[Counted, and offered an action]
    Split -- in flight --> Quiet[Shown, not counted as attention]
    F[A finding] --> Own{Is this screen the owner?}
    Own -- no --> Point[Point at the screen that owns it]
    Own -- yes --> Group[Grouped by file, finding as headline]
    Group --> Susp[Contradicted by the repo, marked suspect]
```

# Goals
- Every headline number means one thing, and the reader can see how it was arrived at.
- What is wrong is separated from what is merely unfinished.
- A screen states the answers it owns and points at the ones it does not.
- Guidance orients the project in front of it rather than an imaginary empty one.

# Non-goals
- The audit and lint rules themselves; this covers how their results are presented.
- Workshop and the CDX family.
- The board, fleet home, details panel, activity feed and Remote screens, covered by the other viewer requests.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Task back-reference: `task_346_deliver_the_corpus_health_and_onboarding_screens`
