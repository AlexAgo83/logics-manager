## item_610_cover_the_extracted_route_branches_and_the_fleet_report - Cover the extracted route branches and the fleet report
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Coverage of moved code
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The two route modules extracted from the viewer report the lowest coverage in the repository, and the fleet report is not much better. Their read paths were verified against a live viewer, but roughly twenty write branches are exercised by nothing.
- They were equally untested before the extraction; the move only made that visible in the report. A refactor that quietly broke one of those branches would not have been caught.

# Scope
- In:
  - Test the write and error branches of both extracted route modules, including malformed bodies and missing arguments.
  - Test the fleet report's command surface: argument handling, both report kinds, text and machine-readable output, and its failure paths.
  - Assert that a module declines a route it does not own, since claiming one would swallow the response.
  - Raise the repository coverage floor to just under the new measured value.
- Out:
  - Changing any route's behavior to make it easier to test.
  - Testing the terminal subsystem's own process handling beyond the request layer.
  - Raising floors for modules this request does not touch.

# Acceptance criteria
- AC1: Both extracted modules cover their write and error branches, not only their read paths.
- AC2: The fleet report covers argument handling, both report kinds, both output formats, and its failure paths.
- AC3: Each module is shown to decline a route it does not own.
- AC4: Coverage of the three modules is materially higher than at the start.
- AC5: The repository floor is raised to just under the new measured total.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Both extracted modules cover their write and error branches, not only their read paths.
- request-AC6 -> This backlog slice. Proof: AC2: The fleet report covers argument handling, both report kinds, both output formats, and its failure paths.
- request-AC5 -> This backlog slice. Proof: AC3: Each module is shown to decline a route it does not own.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_055_say_what_it_does_and_test_what_was_moved`
- Architecture decision(s): (none yet)
- Request: `req_307_close_the_gaps_the_second_review_found_stated_risk_cache_concurrency_and_untested_route_branches`
- Primary task(s): `task_304_orchestrate_the_second_review_remediation`

# AI Context
- Summary: Cover the extracted route branches and the fleet report
- Keywords: scaffolded-backlog, cover the extracted route branches and the fleet report, implementation-ready
- Use when: Implementing the scaffolded slice for Cover the extracted route branches and the fleet report.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the least covered code in the repository, and recently moved
- Rationale: Set by scaffold input or defaulted for grooming.
