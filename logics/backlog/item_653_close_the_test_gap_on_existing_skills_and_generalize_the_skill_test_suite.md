## item_653_close_the_test_gap_on_existing_skills_and_generalize_the_skill_test_suite - Close the test gap on existing skills and generalize the skill test suite
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Test coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- tests/python/test_bundled_delegation_skills.py parametrizes its checks over a DELEGATION_SKILLS set of three skills (implement-task, review-project, groom-issues). corpus is not in that set, so the skill most agents reach for first has never been asserted to have valid frontmatter or to be listed by available_skills().
- Adding four more skills without first fixing this would leave nine skills total with only eight covered, repeating the same gap at larger scale.

# Scope
- In:
  - Add corpus to the test module's covered-skill set (renaming DELEGATION_SKILLS to something accurate like ALL_BUNDLED_SKILLS if the name no longer fits once it covers every skill, not just delegation ones).
  - Extend the module (or add one alongside it) so every one of the eight bundled skills - the four existing ones and the four new ones from this request - runs through the same frontmatter, listing, and provider-neutrality checks.
  - Add a test that fails if a skill directory exists under skill_assets/ but is missing from the covered set, so a ninth skill added later cannot silently ship untested.
- Out:
  - Testing the runtime behavior of each skill's recipe (these are documentation files, not executable code); scope is frontmatter validity and discoverability, matching the existing test style.
  - Rewriting the existing three delegation-skill tests' assertions, only widening their coverage set.

# Acceptance criteria
- AC1: corpus is covered by the same frontmatter/listing/provider-neutrality tests as the three existing delegation skills.
- AC2: All eight bundled skills (corpus, implement-task, review-project, groom-issues, lifecycle-ops, roadmap-deliver, closeout-repair, project-health) are covered by parametrized tests.
- AC3: A test fails if any directory under logics_manager/skill_assets/ is absent from the covered-skill set, catching a future untested addition.
- AC4: The existing three delegation-skill tests' behavior and assertions are unchanged, only their coverage set grows.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: corpus is covered by the same frontmatter/listing/provider-neutrality tests as the three existing delegation skills.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Close the test gap on existing skills and generalize the skill test suite
- Keywords: scaffolded-backlog, close the test gap on existing skills and generalize the skill test suite, implementation-ready
- Use when: Implementing the scaffolded slice for Close the test gap on existing skills and generalize the skill test suite.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - corpus ships today with zero automated coverage; fold it in before adding four more untested skills
- Rationale: Set by scaffold input or defaulted for grooming.
