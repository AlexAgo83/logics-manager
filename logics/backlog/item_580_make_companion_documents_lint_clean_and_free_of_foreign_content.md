## item_580_make_companion_documents_lint_clean_and_free_of_foreign_content - Make companion documents lint-clean and free of foreign content
> From version: 2.19.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Generated content
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The architecture companion generator does not emit the indicator its own linter requires, so every invocation is followed by a guaranteed lint failure the caller must fix by hand.
- Its body is hardcoded prose about this tool's own architecture, which leaked verbatim into an unrelated product's decision record and was discarded in full.
- The generated text was plausible enough not to read as a placeholder, which is why it had to be detected as wrong before it could be replaced.

# Scope
- In:
  - Emit the indicator the linter requires for architecture documents.
  - Replace the hardcoded body with neutral prompts that cannot be mistaken for content.
  - Apply the same treatment to the product companion generator.
  - Assert in a test that a freshly generated companion passes lint with no manual edit.
- Out:
  - Generating substantive content for companion documents from the invocation.
  - Changing which indicators the linter requires.

# Acceptance criteria
- AC1: A freshly generated architecture companion passes `logics-manager lint` with no manual edit.
- AC2: No generated companion body contains content about a product other than the one named in the invocation.
- AC3: Every generated placeholder is recognisable as a placeholder on sight.
- AC4: A test generates each companion kind and asserts lint passes immediately.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A freshly generated architecture companion passes `logics-manager lint` with no manual edit.
- request-AC9 -> This backlog slice. Proof: AC2: No generated companion body contains content about a product other than the one named in the invocation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make companion documents lint-clean and free of foreign content
- Keywords: scaffolded-backlog, make companion documents lint-clean and free of foreign content, implementation-ready
- Use when: Implementing the scaffolded slice for Make companion documents lint-clean and free of foreign content.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
