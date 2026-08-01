## item_574_report_roadmap_headings_that_are_not_parsed_as_milestones - Report roadmap headings that are not parsed as milestones
> From version: 2.19.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Truthful output
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A milestone heading with a non-numeric version was dropped silently: `flow roadmap validate` returned `OK` with a lowered count and named nothing.
- A milestone invisible to the tooling is a milestone that gets skipped, and the count was the only clue that anything had been lost.

# Scope
- In:
  - Make roadmap milestone parsing collect `##` headings it declines to parse and report each one.
  - Report them as warnings that name the heading verbatim, so the operator can see what was dropped.
  - Cover the case with a test using a heading whose version segment is not numeric.
- Out:
  - Widening the accepted milestone version grammar, which is a separate decision.
  - Changing the `OK` verdict when only unparsed headings are present.

# Acceptance criteria
- AC1: A roadmap containing a heading with a non-numeric version segment produces a warning naming that heading verbatim.
- AC2: The milestone count and the reported headings together account for every `##` heading in the document.
- AC3: A test covers a roadmap mixing parsed and unparsed headings.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A roadmap containing a heading with a non-numeric version segment produces a warning naming that heading verbatim.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Report roadmap headings that are not parsed as milestones
- Keywords: scaffolded-backlog, report roadmap headings that are not parsed as milestones, implementation-ready
- Use when: Implementing the scaffolded slice for Report roadmap headings that are not parsed as milestones.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
