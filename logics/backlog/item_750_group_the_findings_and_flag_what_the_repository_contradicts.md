## item_750_group_the_findings_and_flag_what_the_repository_contradicts - Group the findings and flag what the repository contradicts
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 66%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 09:27:43

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

# Delivery notes
- The file is the group and carries its own count; the finding is the headline of its own row. Five consecutive findings printing the same path in link blue with the finding demoted beneath made the screen read as a list of paths. Measured on the live corpus: 13 groups where there were 87 flat rows.
- **A finding the repository contradicts is marked, not removed.** When a finding says a document is missing and the corpus in front of the viewer lists that document, the row is marked suspect and the contradiction is named -- `<path> is present in this corpus`. The finding stays and its own words stay, because the viewer reports and does not adjudicate: the rule may be right for a reason the screen cannot see.
- The check is narrow on purpose: it fires only on a message that says missing, not found, does not exist or absent, *and* names a `.md` path the corpus lists. A broader rule would start marking findings it does not understand, which is the failure it exists to prevent rather than repeat.
- The corpus's own paths travel with the report, so the contradiction is judged against what the viewer is actually showing rather than against the filesystem it cannot read.
- Zero suspects on the live corpus today, which is the honest result: the finding that prompted this slice is not currently reproduced. The check is proven by a fixture that reproduces it and by removing the check and watching that fixture stop being marked.

# Acceptance criteria
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
