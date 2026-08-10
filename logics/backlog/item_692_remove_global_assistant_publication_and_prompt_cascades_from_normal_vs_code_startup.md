## item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup - Remove global assistant publication and prompt cascades from normal VS Code startup
> From version: 2.21.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Quiet onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Remove global assistant publication and prompt cascades from normal VS Code startup
- Keywords: scaffolded-backlog, remove global assistant publication and prompt cascades from normal vs code startup, implementation-ready
- Use when: Implementing the scaffolded slice for Remove global assistant publication and prompt cascades from normal VS Code startup.
- Skip when: The change belongs to another backlog slice.

# Problem
- Startup currently chains prompts for runtime versions, bootstrap, repair, global assistant publication, launch, command copying, and commits. Global skill publication is optional and should not block normal Logics use.

# Scope
- In:
  - Remove automatic startup calls that offer global Codex/Claude publication, launch handoff, command copying, and commit creation.
  - Retain explicit advanced commands for global publication only if they have a supported user need; otherwise delete the unreachable UI and remediation code.
  - Consolidate normal startup feedback into a passive status and Check Environment actions.
  - Rename runtime-update wording so it describes repository bootstrap refresh rather than package installation.
- Out:
  - Removing intentional user-invoked launch commands without replacement.
  - Changing Codex or Claude installation behavior outside this extension.

# Acceptance criteria
- AC1: Opening a healthy project produces no action popup from the Logics extension.
- AC2: Opening a project that needs attention presents one passive status path to Check Environment rather than a chained popup flow.
- AC3: Normal bootstrap and runtime refresh do not publish or launch Codex/Claude and do not offer commit/copy-command prompts.
- AC4: The explicit advanced publication path, if retained, is documented and covered by focused tests.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Opening a healthy project produces no action popup from the Logics extension.
- request-AC8 -> This backlog slice. Proof: AC2: Opening a project that needs attention presents one passive status path to Check Environment rather than a chained popup flow.
- request-AC9 -> This backlog slice. Proof: AC3: Normal bootstrap and runtime refresh do not publish or launch Codex/Claude and do not offer commit/copy-command prompts.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Primary task(s): `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
