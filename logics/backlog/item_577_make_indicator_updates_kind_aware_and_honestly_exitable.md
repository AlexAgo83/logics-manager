## item_577_make_indicator_updates_kind_aware_and_honestly_exitable - Make indicator updates kind-aware and honestly exitable
> From version: 2.19.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Gates
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The mutation path validates against a single global tuple of approved indicators while the linter declares them per document kind, so the two disagree and the gate can recommend a flag the target kind does not accept.
- On a roadmap the recommended remedy cannot work, leaving the marker for non-semantic edits as the only exit, which forces labelling a semantic edit as non-semantic.
- Passing current values returns unchanged and leaves the gate red, so clearing it requires inventing numeric drift, which degrades the indicators into edit counters.
- Written values drop the percent suffix the templates use, so a corpus ends up mixing two forms for one indicator.

# Scope
- In:
  - Validate requested indicators against the target document kind, sourced from the same declaration the linter uses.
  - Make the error name the set that kind accepts.
  - Add a re-baseline path that refreshes the signature without changing any value.
  - Correct the gate's suggested remedy so it is achievable for every kind it fires on.
  - Preserve the template format when writing indicator values.
- Out:
  - Changing which indicators each kind declares.
  - Adding a command that reports approved indicators up front, which belongs to the deferred `doctor` request.

# Acceptance criteria
- AC1: Requesting an indicator the target kind does not declare fails with an error naming that kind's accepted set.
- AC2: The per-kind indicator set is read from one declaration, with a test asserting the mutation path and the linter cannot diverge.
- AC3: A body edit that changes no indicator value can be re-baselined, clearing the gate without altering any value.
- AC4: The gate's suggested remedy succeeds on a roadmap that legitimately keeps its status.
- AC5: A written indicator value matches the format the templates use, verified on a document that already carries the suffixed form.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: Requesting an indicator the target kind does not declare fails with an error naming that kind's accepted set.
- request-AC11 -> This backlog slice. Proof: AC2: The per-kind indicator set is read from one declaration, with a test asserting the mutation path and the linter cannot diverge.
- request-AC12 -> This backlog slice. Proof: AC3: A body edit that changes no indicator value can be re-baselined, clearing the gate without altering any value.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make indicator updates kind-aware and honestly exitable
- Keywords: scaffolded-backlog, make indicator updates kind-aware and honestly exitable, implementation-ready
- Use when: Implementing the scaffolded slice for Make indicator updates kind-aware and honestly exitable.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
