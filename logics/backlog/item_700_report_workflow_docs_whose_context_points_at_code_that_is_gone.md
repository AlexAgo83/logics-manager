## item_700_report_workflow_docs_whose_context_points_at_code_that_is_gone - Report workflow docs whose context points at code that is gone
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Report workflow docs whose context points at code that is gone
- Keywords: backlog-groom, request, report workflow docs whose context points at code that is gone, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Report workflow docs whose context points at code that is gone.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
A `# Context` or `# References` section earns its cost by pointing at real code. Those pointers age: files move, functions are renamed, line numbers shift within days of being written.
A document whose anchors have rotted is worse than one that never had any. A missing pointer costs a search; a wrong pointer costs a search *plus* the time spent believing it, and an agent has no instinct that says "this file felt like it should exist".
Nothing surfaces it. `companion_doc_refs_missing_target` checks references between workflow documents; no equivalent exists for references into the codebase. A corpus of 1359 workflow docs has no way to know how much of what it says about the code is still true.
The value compounds with corpus age, which is exactly when a human stops reading old documents and an agent starts.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: An open workflow doc citing a repo-relative path that does not exist is reported once, naming the document and the path.
- AC2: A symbol cited in backticks and not found anywhere in the repository is reported at a lower confidence than a missing path, with wording that says it is a hint rather than a fact.
- AC3: Line numbers are never validated, and their presence never produces a finding.
- AC4: Documents that are Done, archived, or otherwise closed produce no findings, so historical accuracy is never confused with current accuracy.
- AC5: Every finding is a warning that cannot block `lint`, `audit`, or a closeout gate, and the report stays silent on a corpus with no unresolvable anchors.
- AC6: Tests cover a missing path, an existing path, a missing symbol, a symbol that exists only in a comment, a Done document with rotted anchors producing nothing, and a line number never being checked.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: An open workflow doc citing a repo-relative path that does not exist is reported once, naming the document and the path.
- request-AC2 -> This backlog slice. Proof: AC2: A symbol cited in backticks and not found anywhere in the repository is reported at a lower confidence than a missing path, with wording that says it is a hint rather than a fact.
- request-AC3 -> This backlog slice. Proof: AC3: Line numbers are never validated, and their presence never produces a finding.
- request-AC4 -> This backlog slice. Proof: AC4: Documents that are Done, archived, or otherwise closed produce no findings, so historical accuracy is never confused with current accuracy.
- request-AC5 -> This backlog slice. Proof: AC5: Every finding is a warning that cannot block `lint`, `audit`, or a closeout gate, and the report stays silent on a corpus with no unresolvable anchors.
- request-AC6 -> This backlog slice. Proof: AC6: Tests cover a missing path, an existing path, a missing symbol, a symbol that exists only in a comment, a Done document with rotted anchors producing nothing, and a line number never being checked.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone.md`.
- Generated locally by logics-manager.
- Task `task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_336_report_workflow_docs_whose_context_points_at_code_that_is_gone`
