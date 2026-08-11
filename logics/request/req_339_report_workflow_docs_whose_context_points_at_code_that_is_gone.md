## req_339_report_workflow_docs_whose_context_points_at_code_that_is_gone - Report workflow docs whose context points at code that is gone
> From version: 2.21.6
> Schema version: 1.0
> Status: Draft
> Understanding: 92%
> Confidence: 88%
> Complexity: Medium
> Theme: Corpus decay
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Workflow docs cite files, functions and line numbers that keep drifting after the doc is written, and nothing ever reports a citation that no longer resolves — so an agent is confidently sent to code that is gone.
- Keywords: corpus-decay, stale-references, code-anchors, health, agent-ergonomics
- Use when: Adding a check on whether a document's cited code still exists.
- Skip when: The work concerns references between workflow documents rather than references into the codebase.

# Needs
- A `# Context` or `# References` section earns its cost by pointing at real code. Those pointers age: files move, functions are renamed, line numbers shift within days of being written.
- A document whose anchors have rotted is worse than one that never had any. A missing pointer costs a search; a wrong pointer costs a search *plus* the time spent believing it, and an agent has no instinct that says "this file felt like it should exist".
- Nothing surfaces it. `companion_doc_refs_missing_target` checks references between workflow documents; no equivalent exists for references into the codebase. A corpus of 1359 workflow docs has no way to know how much of what it says about the code is still true.
- The value compounds with corpus age, which is exactly when a human stops reading old documents and an agent starts.

# Context
- The anchors are already structured enough to check: `# References` is a list of repo-relative paths, and `# Context` cites paths and symbols in backticks. The audit already parses these sections for other rules.
- Three tiers, in descending confidence and ascending cost. A **path** either exists or does not — decidable, no false positives. A **symbol** (a function or constant named in backticks) can be searched for; absence is strong evidence, though not proof. A **line number** is stale almost immediately and should not be checked at all.
- Only the first two are worth acting on, and the finding must be a warning: a path may legitimately name a file the work will create, and a document about deleted code correctly cites something gone.
- A doc's own lifecycle matters. A `Done` document describing code as it was is history and should not be nagged about; the value is in **open** documents, which are the ones an agent is about to act on.
- Scope: detecting and reporting unresolvable code anchors in open workflow docs. Out of scope: repairing them automatically, line-number validation, and any rule about which anchors a document ought to have.
- Known risk: a noisy version of this check is worse than no check, because it teaches the reader to ignore the report. It has to stay quiet on a healthy corpus, which makes the default reporting behaviour dependent on how withheld findings are surfaced generally.
- **Depends on `req_333`** for that quietness: this request adds a finding class, and the mechanism that withholds low-signal findings from the default report — plus the one-line count that keeps them from disappearing — is defined there. Building a second, private suppression path here is the outcome to avoid. If `req_333` has not landed, AC5 is met by emitting nothing at all rather than by inventing a new switch.

# Acceptance criteria
- AC1: An open workflow doc citing a repo-relative path that does not exist is reported once, naming the document and the path.
- AC2: A symbol cited in backticks and not found anywhere in the repository is reported at a lower confidence than a missing path, with wording that says it is a hint rather than a fact.
- AC3: Line numbers are never validated, and their presence never produces a finding.
- AC4: Documents that are Done, archived, or otherwise closed produce no findings, so historical accuracy is never confused with current accuracy.
- AC5: Every finding is a warning that cannot block `lint`, `audit`, or a closeout gate, and the report stays silent on a corpus with no unresolvable anchors.
- AC6: Tests cover a missing path, an existing path, a missing symbol, a symbol that exists only in a comment, a Done document with rotted anchors producing nothing, and a line number never being checked.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/audit.py`
- `logics_manager/insights.py`
- `logics_manager/doc_parsing.py`
- `tests/python/test_audit_cli.py`

# Backlog
- `item_700_report_workflow_docs_whose_context_points_at_code_that_is_gone`
