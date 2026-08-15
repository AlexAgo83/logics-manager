## item_811_give_every_stage_with_a_colour_token_its_accent - Give every stage with a colour token its accent
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: One colour language
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: stage, colour, token, accent
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `.card[data-stage="roadmap"]` and `.card[data-stage="runbook"]` have no accent rule, so both draw the grey base while their colour tokens already exist.
- The same omission was found and fixed for the progress bar in item_790; the accent kept its own copy of the stage list and was missed, which is the shape of the defect rather than an accident.

# Scope
- In:
  - Every stage that has a `--stage-color-*` token carries it on the card accent.
  - Remove the second copy of the stage list if the two can read one declaration, so the next stage added cannot be half-coloured again.
- Out:
  - Adding colour tokens for stages that have none.
  - Changing any existing stage's colour.

# Acceptance criteria
- AC1: A roadmap card and a runbook card each draw their own stage colour on the accent.
- AC2: No stage with a colour token is left drawing the neutral base.
- AC3: A test fails if a token is added without its accent, rather than the omission being noticed on a screenshot.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A roadmap card and a runbook card each draw their own stage colour on the accent.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Primary task(s): `task_376_orchestrate_the_loading_feedback_and_navigation_polish`

# Priority
- Priority: Medium - a stage that looks like no stage
- Rationale: Set by scaffold input or defaulted for grooming.
