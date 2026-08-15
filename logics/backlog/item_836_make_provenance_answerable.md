## item_836_make_provenance_answerable - Make provenance answerable
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Provenance is data
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:29:34

# AI Context
- Summary: One reader for which issues a request names and which requests cover an issue, so the report and the closeout notice do not each parse the section.
- Keywords: provenance reader, queryable, one answer
- Use when: Anything needs to know what an issue links to, or the reverse.
- Skip when: Changing how provenance is written.

# Problem
- `# Provenance` is prose bullets, so 'which issues does this corpus cover' and 'which request covers issue 20' can only be answered by grepping.
- The reconciliation report and the closeout notice both need that answer, and each deriving it separately is how they come to disagree.

# Scope
- In:
  - One reader that returns the issues a request names, and the requests naming a given issue.
  - Read what is written today, including the intake's shape, without a migration.
  - Expose it wherever the corpus is already queried, so an agent can ask.
- Out:
  - Changing how provenance is written.
  - Backfilling the corpus: that is the attach command's job, one request at a time.

# Acceptance criteria
- AC1: The reader returns req_302's issue from what is already written, with no change to that document.
- AC2: It returns nothing, not an error, for a request with no provenance.
- AC3: The reconciliation report and the closeout notice both read it rather than parsing the section again.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The reader returns req_302's issue from what is already written, with no change to that document.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Primary task(s): `task_383_orchestrate_the_issue_bridge_work`

# Priority
- Priority: Medium
- Rationale: Two later slices read this answer, and each deriving it separately is how they drift -- but nothing is visible until one of them exists.
