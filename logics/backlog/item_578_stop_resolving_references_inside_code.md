## item_578_stop_resolving_references_inside_code - Stop resolving references inside code
> From version: 2.19.5
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Low
> Theme: Reference handling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-01

# Problem
- Reference extraction strips fenced mermaid blocks only, so a reference quoted in any other fence or in an inline code span is resolved as a genuine link.
- Writing the field report tripped the audit three times, and quoting the diagnostic reproduced the diagnostic.
- Any document that discusses references cannot show one without inventing an unresolvable link, and the rule cannot distinguish a document that links to a missing document from a document that is about links.

# Scope
- In:
  - Exclude all fenced code blocks and inline code spans from reference extraction, not only mermaid fences.
  - Apply the exclusion everywhere references are extracted, so lint, audit and repair agree.
  - Cover the case with a document quoting a reference in a fence, in an inline span, and as a genuine link.
- Out:
  - An escape syntax for citing a reference in running prose, which is deferred and largely subsumed by this fix.

# Acceptance criteria
- AC1: A reference inside a fenced code block is not resolved as a link, whatever the fence language.
- AC2: WITHDRAWN during implementation. This originally required inline code spans to be excluded too. That is incompatible with the corpus: backticks are how every genuine link is written (`- Request: \`req_...\``), so excluding inline spans would delete every real reference rather than only the quoted ones. Fenced blocks carry the whole reported defect; inline spans must keep resolving.
- AC3: A genuine reference outside a fence is still resolved, including one written as an inline span, with a test covering all forms in one document.
- AC4: Lint, audit and the repair commands agree on which references a document contains.

# AC Traceability
- request-AC13 -> This backlog slice. Proof: AC1: A reference inside a fenced code block is not resolved as a link.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Stop resolving references inside code
- Keywords: scaffolded-backlog, stop resolving references inside code, implementation-ready
- Use when: Implementing the scaffolded slice for Stop resolving references inside code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
