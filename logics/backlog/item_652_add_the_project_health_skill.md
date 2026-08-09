## item_652_add_the_project_health_skill - Add the project-health skill
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Skill coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- doctor, health, audit, and insights have no dedicated skill, but review-project already opens with health/audit/search-docs as its first step, so a new skill risks duplicating that boundary rather than filling a gap.
- There is no skill for running these checks as a stand-alone diagnostic pass, outside the context of writing up a review request.

# Scope
- In:
  - A new SKILL.md at logics_manager/skill_assets/project-health/ following the existing conventions.
  - Scope it as read-only diagnosis with no output document: a pre-flight check before other work, not a capture step.
  - A hard rule stating this skill does not write a request; review-project owns that, and this skill should say so explicitly and point to it.
  - Cover doctor, health, audit, and insights, including how to read their combined output.
  - Add this skill to the same parametrized skill-test set as lifecycle-ops.
- Out:
  - Writing any Logics document.
  - Duplicating review-project's capture recipe.
  - New CLI diagnostics; only wraps what doctor/health/audit/insights already report.

# Acceptance criteria
- AC1: The skill's frontmatter names concrete trigger phrases distinct from review-project's ('is the project healthy', 'run diagnostics'; not 'review this codebase').
- AC2: A hard rule states the skill produces no document and defers capture to review-project.
- AC3: The recipe covers doctor, health, audit, and insights with guidance on reading their combined output.
- AC4: review-project is unchanged.
- AC5: `logics-manager skills install` discovers and installs the new skill without code changes.
- AC6: An automated test asserts this skill's frontmatter is valid and that it is listed by available_skills().

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The skill's frontmatter names concrete trigger phrases distinct from review-project's ('is the project healthy', 'run diagnostics'; not 'review this codebase').
- request-AC5 -> This backlog slice. Proof: AC2: A hard rule states the skill produces no document and defers capture to review-project.
- request-AC8 -> This backlog slice. Proof: AC3: The recipe covers doctor, health, audit, and insights with guidance on reading their combined output.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Add the project-health skill
- Keywords: scaffolded-backlog, add the project-health skill, implementation-ready
- Use when: Implementing the scaffolded slice for Add the project-health skill.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - useful but must not duplicate review-project
- Rationale: Set by scaffold input or defaulted for grooming.
