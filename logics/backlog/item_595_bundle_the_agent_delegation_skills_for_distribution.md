## item_595_bundle_the_agent_delegation_skills_for_distribution - Bundle the agent delegation skills for distribution
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Low
> Theme: Agent enablement
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- An external orchestrator maintains a set of delegation skills describing how to drive Logics work through an agent, copying each one by hand onto every machine and tracking their versions in prose.
- This project already ships and installs bundled skills, so there is a distribution channel these skills are not using.

# Scope
- In:
  - Add tool-agnostic delegation skills covering implementing a task, grooming external issues into a corpus, and reviewing a project into a captured request.
  - Express each skill against this project's own command surface, with no dependency on a specific orchestrator or agent runtime.
  - Include them in the bundled-skills listing and installation path so they update with the package.
- Out:
  - Skills tied to a specific external orchestrator, agent runtime, or provider.
  - Executing the skills from this project.
  - Replacing an orchestrator's own runtime skill storage.

# Acceptance criteria
- AC1: The delegation skills are listed and installed by the existing bundled-skills commands.
- AC2: Each skill references only this project's documented command surface.
- AC3: Installing them alongside the existing bundled skills causes no name or path collision.
- AC4: Tests cover listing, installation into a temporary target directory, and repeated installation.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: The delegation skills are listed and installed by the existing bundled-skills commands.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Bundle the agent delegation skills for distribution
- Keywords: scaffolded-backlog, bundle the agent delegation skills for distribution, implementation-ready
- Use when: Implementing the scaffolded slice for Bundle the agent delegation skills for distribution.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Low - valuable once the contract work lands
- Rationale: Set by scaffold input or defaulted for grooming.
