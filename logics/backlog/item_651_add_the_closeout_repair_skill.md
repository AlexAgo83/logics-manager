## item_651_add_the_closeout_repair_skill - Add the closeout-repair skill
> From version: 2.21.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 11%
> Complexity: Low
> Theme: Skill coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- validate-closeout, repair, gates, ac-traceability, links, and mermaid are six distinct repair sub-commands with overlapping purposes; today only --apply-fixes is mentioned, in passing, inside the corpus skill's gotchas.
- An agent facing a blocked closeout has no documented decision path for which of the six commands to reach for.

# Scope
- In:
  - A new SKILL.md at logics_manager/skill_assets/closeout-repair/ following the existing conventions.
  - Frame the recipe as a troubleshooting decision path: given a specific validate-closeout failure, which repair command addresses it.
  - Cross-reference from the corpus skill's existing --apply-fixes gotcha to this new skill, without duplicating its content.
  - Add this skill to the same parametrized skill-test set as lifecycle-ops.
- Out:
  - Changing what any of the six repair commands actually does.
  - Automatic repair selection; the agent still runs the commands explicitly.

# Acceptance criteria
- AC1: The skill's frontmatter names concrete trigger phrases for a stuck or failing closeout.
- AC2: The recipe maps at least one concrete validate-closeout failure to each of the six repair sub-commands.
- AC3: The corpus skill's existing --apply-fixes gotcha links to this skill instead of duplicating its content.
- AC4: `logics-manager skills install` discovers and installs the new skill without code changes.
- AC5: An automated test asserts this skill's frontmatter is valid and that it is listed by available_skills().

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The skill's frontmatter names concrete trigger phrases for a stuck or failing closeout.
- request-AC5 -> This backlog slice. Proof: AC2: The recipe maps at least one concrete validate-closeout failure to each of the six repair sub-commands.
- request-AC8 -> This backlog slice. Proof: AC3: The corpus skill's existing --apply-fixes gotcha links to this skill instead of duplicating its content.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Add the closeout-repair skill
- Keywords: scaffolded-backlog, add the closeout-repair skill, implementation-ready
- Use when: Implementing the scaffolded slice for Add the closeout-repair skill.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - a real but narrower gap; already half-mentioned inside /corpus
- Rationale: Set by scaffold input or defaulted for grooming.
