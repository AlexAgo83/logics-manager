## item_650_add_the_roadmap_deliver_skill - Add the roadmap-deliver skill
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Skill coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- roadmap propose/show/validate and deliver form the product-level chain above requests, and no skill documents any of it.
- roadmap validate enforces a document contract that is not obvious from the command name alone.

# Scope
- In:
  - A new SKILL.md at logics_manager/skill_assets/roadmap-deliver/ following the existing conventions.
  - Cover proposing a roadmap companion doc, showing a bounded roadmap view, validating its contract, and delivering a chain from a product brief.
  - Document what roadmap validate actually checks, as a gotcha, so failures are diagnosable from the skill alone.
  - Add this skill to the same parametrized skill-test set as lifecycle-ops.
- Out:
  - Scoping new requests from a roadmap; that stays with /corpus.
  - Changing the roadmap document contract itself.

# Acceptance criteria
- AC1: The skill's frontmatter names concrete trigger phrases for roadmap and delivery work.
- AC2: The recipe covers propose, show, validate, and deliver with at least one worked example each.
- AC3: Gotchas explain what roadmap validate's contract actually enforces.
- AC4: `logics-manager skills install` discovers and installs the new skill without code changes.
- AC5: An automated test asserts this skill's frontmatter is valid and that it is listed by available_skills().

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The skill's frontmatter names concrete trigger phrases for roadmap and delivery work.
- request-AC5 -> This backlog slice. Proof: AC2: The recipe covers propose, show, validate, and deliver with at least one worked example each.
- request-AC8 -> This backlog slice. Proof: AC3: Gotchas explain what roadmap validate's contract actually enforces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Add the roadmap-deliver skill
- Keywords: scaffolded-backlog, add the roadmap-deliver skill, implementation-ready
- Use when: Implementing the scaffolded slice for Add the roadmap-deliver skill.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a whole product-level chain currently has zero skill coverage
- Rationale: Set by scaffold input or defaulted for grooming.
