## item_750_group_the_findings_and_flag_what_the_repository_contradicts - Group the findings and flag what the repository contradicts
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Five consecutive findings print the same file path as their headline in link blue with the finding demoted beneath, and one reports a document as absent from the repository when it exists on disk.
- Keywords: findings grouping, file path headline, false positive, stale citation rule, suspect finding
- Use when: Changing how validation findings are listed, grouped or qualified.
- Skip when: Fixing the audit rule; the viewer reports, it does not adjudicate.

# Problem
- Five consecutive findings print the same file path as their headline in link blue with the finding demoted beneath, and one of them reports a document as absent from the repository when it exists on disk. One unreliable finding discredits the other eighty-six.

# Scope
- In:
  - Group findings by file, with counts, and make the finding the headline.
  - Mark a finding the repository itself contradicts as suspect, without claiming to know why the rule produced it.
- Out:
  - Fixing the audit rule; the viewer reports, it does not adjudicate.

# Acceptance criteria
- AC7: Findings are grouped by file with the finding as the headline.
- AC8: A contradicted finding is visibly suspect.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: Findings are grouped by file with the finding as the headline.
- request-AC8 -> This backlog slice. Proof: AC8: A contradicted finding is visibly suspect.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
