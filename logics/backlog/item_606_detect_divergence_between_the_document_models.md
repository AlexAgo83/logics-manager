## item_606_detect_divergence_between_the_document_models - Detect divergence between the document models
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Model consistency
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Six independent implementations parse the same workflow documents into six different models. They agree exactly today, on which documents exist and on their statuses, so merging them would be a large change against a theoretical risk.
- The derived fields are where it has already gone wrong: two staleness thresholds disagreed across surfaces, and one age computation existed three times, until a recent change unified them.

# Scope
- In:
  - Add a test asserting the document models agree on the set of documents they see and on each document's status.
  - Make the failure message name the disagreeing models and the documents involved.
  - Cover the derived fields that are now shared, so re-forking one is caught.
  - Document that a new derived field belongs in the shared layer, not in a model.
- Out:
  - Merging the models.
  - Changing any model's shape or fields.
  - Comparing fields that are legitimately model-specific.

# Acceptance criteria
- AC1: The test compares every document model and passes against the current codebase.
- AC2: An injected divergence fails the test, naming the models and documents.
- AC3: The shared derived fields are covered, so re-forking one is caught.
- AC4: The test runs in continuous integration with the rest of the suite.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The test compares every document model and passes against the current codebase.
- request-AC8 -> This backlog slice. Proof: AC2: An injected divergence fails the test, naming the models and documents.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Primary task(s): `task_303_orchestrate_the_repository_review_remediation`

# AI Context
- Summary: Detect divergence between the document models
- Keywords: scaffolded-backlog, detect divergence between the document models, implementation-ready
- Use when: Implementing the scaffolded slice for Detect divergence between the document models.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - a detector is the proportionate answer to a risk that already materialised once
- Rationale: Set by scaffold input or defaulted for grooming.
