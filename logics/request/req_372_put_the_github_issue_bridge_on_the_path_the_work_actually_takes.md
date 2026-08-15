## req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes - Put the GitHub issue bridge on the path the work actually takes
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: GitHub issue intake
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:05:08

# AI Context
- Summary: The bridge works and is unused: it assumes an issue is triaged before the work starts, and the work starts in a conversation. Three uses in its first week, none since.
- Keywords: github issues, intake, drift, provenance, door on the wrong path
- Use when: The tracker and the corpus have stopped describing the same thing.
- Skip when: Mirroring GitHub discussions, which is ruled out.

# Needs
- As a maintainer, I need to see where the corpus and the issue tracker have drifted apart, rather than having to remember to keep them together.
- As a maintainer, I need to attach an issue to a request that already exists, because the request is usually written before anyone thinks about the issue.
- As a maintainer, I need delivering a request to be the moment its issues are told, instead of a form I have to fill in by hand afterwards.
- As an operator or an agent, I need to ask which issues this corpus covers and get an answer from data rather than from prose.

# Context
- The bridge is already built: issue forms, an intake workflow that turns a `logics:triage` label into a Logics request on a branch with a PR, a `# Provenance` section carrying `Origin`, `External id` and `External issue`, and a lifecycle-update workflow. None of this needs inventing.
- It has been used three times, all in its first week. Issues #5 and #7 were intake tests; #9 is the only complete cycle, carrying `logics:triage` and `logics:delivered`. Issues #12 through #19 closed carrying no label and no Logics link at all.
- Issues #20 and #21 are open and unlabelled, and `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy` -- which delivered both -- is Done and closed out. The work shipped and the issues were never told.
- In the corpus the same gap shows as data: exactly one request of 371 carries a `# Provenance` section -- req_302, the one the intake workflow created. req_357 records its two issues as URLs under `# References`, which nothing can query.
- The reason is not neglect. The bridge assumes an issue is triaged on GitHub before the work starts, and the work starts somewhere else: a conversation, then a scaffolded chain, then delivery. The door is not on the path people walk, which is the same defect shape as req_369's unused `?focus=` -- an affordance that works and is never reached.
- Lifecycle feedback is a `workflow_dispatch` with three inputs, one of which is a Logics ref the maintainer has to look up. That is why it has run once.
- Issue content is untrusted, and `docs/github-issues.md` already states this. Reconciliation must read state -- numbers, labels, open or closed -- and never a body.

# Acceptance criteria
- AC1: A report states where the corpus and the issue tracker disagree: issues with no request, requests that are Done whose issues are still open, and issues closed while their request is still open.
- AC2: An issue can be attached to a request that already exists, without hand-editing the document.
- AC3: Finishing a request that names issues offers to tell them, as an explicit step that never fires on its own.
- AC4: Provenance is queryable: which issues the corpus covers, and which request covers a given issue, answered from data rather than by grepping prose.
- AC5: Nothing in this work reads an issue body, and the untrusted-content rule stays stated where it is stated today.
- AC6: The drift this request was opened over -- issues #20 and #21 open against a delivered req_357 -- is closed by using what this work builds, not by hand.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)

# References
- docs/github-issues.md
- logics_manager/mcp_request.py
- scripts/github/create_logics_request_from_issue.py
- .github/workflows/logics-issue-update.yml
- logics/request/req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy.md

# Backlog
- `item_834_report_where_the_corpus_and_the_tracker_disagree`
- `item_835_attach_an_issue_to_a_request_that_already_exists`
- `item_836_make_provenance_answerable`
- `item_837_tell_the_issues_when_the_request_is_delivered`
- `item_838_close_the_drift_this_request_was_opened_over`
