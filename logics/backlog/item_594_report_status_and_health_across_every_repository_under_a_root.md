## item_594_report_status_and_health_across_every_repository_under_a_root - Report status and health across every repository under a root
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Fleet reporting
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- There is no way to ask about more than one repository, so an external orchestrator implemented corpus discovery twice and wrote its own aggregation loop over the per-repository commands.
- That loop also had to decide, on its own, that one repository's failure must not fail the whole report.

# Scope
- In:
  - Add a fleet command reporting status and health for every repository containing a Logics corpus under a given root directory.
  - Capture a per-repository failure inline in that repository's entry and continue with the remaining repositories.
  - Support both human-readable and machine-readable output, and reuse the existing per-repository implementations rather than reimplementing them.
  - Treat directory discovery as the source of truth, with no maintained repository list.
- Out:
  - Mutating operations across repositories.
  - Concurrent execution or performance tuning of the scan.
  - A maintained registry of repositories.
  - Cross-repository dependency analysis.

# Acceptance criteria
- AC1: The command discovers every repository containing a Logics corpus under the given root and reports status and health for each.
- AC2: A repository that fails is reported with its error inline, and the remaining repositories are still reported.
- AC3: A root containing no corpus yields an empty, successful report rather than an error.
- AC4: Machine-readable output keys each entry by repository and is stable across invocations.
- AC5: Tests cover discovery, a failing repository, an empty root, and nested directories that are not corpora.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: The command discovers every repository containing a Logics corpus under the given root and reports status and health for each.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Report status and health across every repository under a root
- Keywords: scaffolded-backlog, report status and health across every repository under a root, implementation-ready
- Use when: Implementing the scaffolded slice for Report status and health across every repository under a root.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - convenience layer once explicit targeting exists
- Rationale: Set by scaffold input or defaulted for grooming.
