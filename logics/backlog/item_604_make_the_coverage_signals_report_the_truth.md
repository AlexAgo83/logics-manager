## item_604_make_the_coverage_signals_report_the_truth - Make the coverage signals report the truth
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Measurement honesty
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Continuous integration installs Python coverage tooling under a step named for it, then runs the suite without invoking it, so no Python coverage exists while the step name says otherwise. Measured directly it is around seventy-five percent.
- The browser host is excluded from JavaScript coverage for a correct but unrecorded reason: its tests load the built bundle rather than its sources, so instrumenting the sources would report a number far below the real coverage and invite unnecessary work.

# Scope
- In:
  - Either measure Python coverage in continuous integration with a floor below the current value, or remove the tooling step that is never used. One or the other, not the present middle.
  - Record why the browser host is excluded from JavaScript coverage, at the configuration site.
  - Keep the existing JavaScript coverage targets and thresholds unchanged.
- Out:
  - Raising any existing coverage threshold.
  - Restructuring the browser host tests so its sources can be instrumented.
  - Adding coverage reporting to an external service.

# Acceptance criteria
- AC1: Python coverage is either measured with an enforced floor, or its unused tooling step is gone.
- AC2: If enforced, the floor sits below the currently measured value so the build does not start red.
- AC3: The browser host exclusion carries its reason where the exclusion is configured.
- AC4: Existing JavaScript coverage targets and thresholds are unchanged.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Python coverage is either measured with an enforced floor, or its unused tooling step is gone.
- request-AC3 -> This backlog slice. Proof: AC2: If enforced, the floor sits below the currently measured value so the build does not start red.
- request-AC8 -> This backlog slice. Proof: AC3: The browser host exclusion carries its reason where the exclusion is configured.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Primary task(s): `task_303_orchestrate_the_repository_review_remediation`

# AI Context
- Summary: Make the coverage signals report the truth
- Keywords: scaffolded-backlog, make the coverage signals report the truth, implementation-ready
- Use when: Implementing the scaffolded slice for Make the coverage signals report the truth.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a build step currently implies a measurement it never takes
- Rationale: Set by scaffold input or defaulted for grooming.
