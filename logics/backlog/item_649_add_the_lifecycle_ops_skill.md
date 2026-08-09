## item_649_add_the_lifecycle_ops_skill - Add the lifecycle-ops skill
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Skill coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- split, promote, withdraw, close, finish task, and progress task have no skill: an agent asked to re-scope, retire, or manually close a doc has to read --help or docs/cli.md cold, with no worked recipe or gotchas.
- These are also the commands most likely to be run on a doc that already has history (linked children, progress recorded), so the wrong sequence is easy to get into without a documented recipe.

# Scope
- In:
  - A new SKILL.md at logics_manager/skill_assets/lifecycle-ops/ following the existing frontmatter, hard-rules, recipe, gotchas structure.
  - Cover: when to split vs. leave a doc as-is, promote vs. scaffold a new chain, withdraw vs. close, and how finish/progress interact with parent docs.
  - Document propagation behavior (e.g. closing a task propagates to its backlog item) as a gotcha, not just a command list.
  - Reuse the existing skills-install mechanism; no installer code changes.
  - Add this skill to the parametrized set in tests/python/test_bundled_delegation_skills.py (or an equivalent module covering all skills), so it gets the same frontmatter/listing/provider-neutrality checks as the existing skills.
- Out:
  - Automating any of these operations outside the skill's documented CLI calls.
  - Changing the underlying CLI commands' behavior.
  - Covering roadmap or closeout-repair commands, which get their own skills.

# Acceptance criteria
- AC1: The skill's frontmatter description matches the SKILL.md convention and names concrete trigger phrases.
- AC2: The recipe covers split, promote, withdraw, close, finish task, and progress task with at least one worked example each.
- AC3: Gotchas cover at least one propagation behavior (e.g. what closing a parent/child does to the other).
- AC4: `logics-manager skills install` discovers and installs the new skill without code changes.
- AC5: The four existing skills are unchanged.
- AC6: An automated test asserts this skill's frontmatter is valid and that it is listed by available_skills().

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The skill's frontmatter description matches the SKILL.md convention and names concrete trigger phrases.
- request-AC5 -> This backlog slice. Proof: AC2: The recipe covers split, promote, withdraw, close, finish task, and progress task with at least one worked example each.
- request-AC8 -> This backlog slice. Proof: AC3: Gotchas cover at least one propagation behavior (e.g. what closing a parent/child does to the other).

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Add the lifecycle-ops skill
- Keywords: scaffolded-backlog, add the lifecycle-ops skill, implementation-ready
- Use when: Implementing the scaffolded slice for Add the lifecycle-ops skill.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the largest gap; these commands have no documentation for agents today
- Rationale: Set by scaffold input or defaulted for grooming.
