## item_834_report_where_the_corpus_and_the_tracker_disagree - Report where the corpus and the tracker disagree
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Drift is reported, not remembered
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:05:08

# AI Context
- Summary: Three questions answered in one report: issues with no request, Done requests whose issues are open, closed issues whose request is open.
- Keywords: reconciliation, drift, github issues, state not content
- Use when: Asking whether the corpus and the tracker still agree.
- Skip when: You want to act on the drift; this reports it.

# Problem
- Nothing compares the two, so the only way to notice that issues #20 and #21 are open against a delivered request is to go and look, which is what did not happen.
- Ten issues closed carrying no Logics link at all, and nothing said so at any point.

# Scope
- In:
  - A report answering three questions: open issues with no linked request, Done requests whose issues are still open, and closed issues whose request is still open.
  - Read issue state only -- number, state, labels -- never a body.
  - Degrade to a clear statement when the tracker cannot be reached, rather than reporting an empty disagreement.
- Out:
  - Mirroring issue content into the corpus.
  - Acting on the drift: this reports it.
  - Reconciling anything but issues -- not pull requests, not discussions.

# Acceptance criteria
- AC1: The report names each of the three disagreements separately, with the issue numbers and the Logics refs involved.
- AC2: With no network or no `gh`, it says the tracker could not be read rather than reporting that nothing is wrong.
- AC3: No issue body is read, and nothing in the output can be influenced by one.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The report names each of the three disagreements separately, with the issue numbers and the Logics refs involved.
- request-AC5 -> This backlog slice. Proof: AC2: With no network or no `gh`, it says the tracker could not be read rather than reporting that nothing is wrong.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Primary task(s): `task_383_orchestrate_the_issue_bridge_work`

# Priority
- Priority: High - it makes the drift visible instead of requiring discipline
- Rationale: Set by scaffold input or defaulted for grooming.
