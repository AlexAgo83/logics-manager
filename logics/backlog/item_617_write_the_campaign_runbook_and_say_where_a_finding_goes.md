## item_617_write_the_campaign_runbook_and_say_where_a_finding_goes - Write the campaign runbook and say where a finding goes
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Campaign practice
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The campaign will produce a report and a set of captures that nothing explains: how to run it, what its two halves are, what a failed check means, and what to do with a defect it finds.
- Sibling projects answer this in a runbook, and the answer that matters is that a defect in already-delivered scope becomes a workflow slice rather than a note in a file. Without that, findings are read once and lost.
- The automated pass also cannot judge whether a screen reads well, so the runbook has to say what a human still has to look at, including the extension host, whose boundary the automated pass does not exercise.

# Scope
- In:
  - Document how to run the campaign, what it covers section by section, and where the report and captures land.
  - State that a failed check is a defect or a stale expectation, and that the measured value is what decides which.
  - State that a zero-finding run is not a pass on its own, and that a defect the checks missed is fixed by adding the check in the same change.
  - Describe the attended pass: opening the viewer, and opening the extension webview, to judge what the automated pass cannot.
  - State that a finding in already-delivered scope becomes a workflow slice, with the command that scaffolds it.
  - State that captures show the operator's own documents and stay in the ignored artifacts directory.
- Out:
  - Automating the attended pass.
  - Building a demo corpus so captures become shareable, which is a separate decision.
  - Documenting the unit suite, which is covered elsewhere.

# Acceptance criteria
- AC1: A runbook states how to run the campaign, what it covers, and where its output lands.
- AC2: It states how to read a failed check, and that a zero-finding run is not a pass on its own.
- AC3: It describes the attended pass, including the extension webview.
- AC4: It states that a finding becomes a workflow slice, with the command.
- AC5: It states where captures live and why they stay there.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: A runbook states how to run the campaign, what it covers, and where its output lands.
- request-AC6 -> This backlog slice. Proof: AC2: It states how to read a failed check, and that a zero-finding run is not a pass on its own.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_057_a_viewer_campaign_that_reports_what_it_saw`
- Architecture decision(s): (none yet)
- Request: `req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured`
- Primary task(s): `task_306_orchestrate_the_viewer_ui_campaign`

# AI Context
- Summary: Write the campaign runbook and say where a finding goes
- Keywords: scaffolded-backlog, write the campaign runbook and say where a finding goes, implementation-ready
- Use when: Implementing the scaffolded slice for Write the campaign runbook and say where a finding goes.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - without it the report is read once and the findings evaporate
- Rationale: Set by scaffold input or defaulted for grooming.
