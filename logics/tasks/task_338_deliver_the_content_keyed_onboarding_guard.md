## task_338_deliver_the_content_keyed_onboarding_guard - Deliver the content-keyed onboarding guard
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 10:37:48

# AI Context
- Summary: Add the nonce-independent signature beside the builder first, then switch the guard to it; everything else depends on the signature being stable across builds.
- Keywords: onboarding, content-signature, orchestration, vscode
- Use when: Coordinating delivery of the content-keyed onboarding guard.
- Skip when: Working on unrelated viewer or extension surfaces.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Add the signature beside the builder first, with the nonce-independence test, since everything else depends on it being stable.
- [ ] 2. Switch the guard to the new key and prove the version bump no longer reopens.
- [ ] 3. Confirm the on-demand paths and per-workspace isolation are untouched.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run tests/logicsOnboardingGuard.test.ts -t 'stays closed however many versions ship'` | result: passed | four version bumps over unchanged content reopen nothing after the first show Source: `45dbb326`
- request-AC2 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run -t 'reopens once when the content actually changes'` | result: passed | a changed signature reopens exactly once, then stays closed Source: `45dbb326`
- request-AC3 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run -t 'identical across builds, because it never sees the nonce'` | result: passed | five successive builds yield one signature; the nonce and CSP are never hashed Source: `45dbb326`
- request-AC4 -> This task. Proof: date: 2026-08-11 | command: `grep -n onboardingContentParts clients/vscode/src/logicsOnboardingHtml.ts` | result: 2 call sites, 1 definition | onboardingContentParts is the one source read by both buildOnboardingHtml and onboardingContentSignature, so a new section changes both Source: `45dbb326`
- request-AC5 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run -t 'stays scoped per workspace root'` | result: passed | workspace-b shows the page after workspace-a has seen it; each root keyed separately Source: `45dbb326`
- request-AC6 -> This task. Proof: date: 2026-08-11 | command: `git diff --stat clients/vscode/src/logicsViewProviderSupport.ts` | result: only maybeshowonboarding and its import changed | openOnboardingPanel is untouched; the Tools and Insights buttons call it directly and never consult the stored signature Source: `45dbb326`
- request-AC7 -> This task. Proof: date: 2026-08-11 | command: `npx vitest run` | result: 81 files, 855 passed | six tests in tests/logicsOnboardingGuard.test.ts; the two carrying the complaint confirmed failing against the old version-keyed logic before the switch Source: `45dbb326`

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`
- Related request(s): `req_341_stop_reopening_getting_started_when_its_content_has_not_changed`

# Links
- Request: `req_341_stop_reopening_getting_started_when_its_content_has_not_changed`
- Product brief(s): `prod_077_a_plugin_that_interrupts_only_when_it_has_something_new_to_say`
- Architecture decision(s): (none yet)

# Evidence
- AC1 | date: 2026-08-11 | command: `npx vitest run tests/logicsOnboardingGuard.test.ts -t 'stays closed however many versions ship'` | result: passed | four version bumps over unchanged content reopen nothing after the first show
- AC2 | date: 2026-08-11 | command: `npx vitest run -t 'reopens once when the content actually changes'` | result: passed | a changed signature reopens exactly once, then stays closed
- AC3 | date: 2026-08-11 | command: `npx vitest run -t 'identical across builds, because it never sees the nonce'` | result: passed | five successive builds yield one signature; the nonce and CSP are never hashed
- AC4 | date: 2026-08-11 | command: `grep -n onboardingContentParts clients/vscode/src/logicsOnboardingHtml.ts` | result: 2 call sites, 1 definition | onboardingContentParts is the one source read by both buildOnboardingHtml and onboardingContentSignature, so a new section changes both
- AC5 | date: 2026-08-11 | command: `npx vitest run -t 'stays scoped per workspace root'` | result: passed | workspace-b shows the page after workspace-a has seen it; each root keyed separately
- AC6 | date: 2026-08-11 | command: `git diff --stat clients/vscode/src/logicsViewProviderSupport.ts` | result: only maybeshowonboarding and its import changed | openOnboardingPanel is untouched; the Tools and Insights buttons call it directly and never consult the stored signature
- AC7 | date: 2026-08-11 | command: `npx vitest run` | result: 81 files, 855 passed | six tests in tests/logicsOnboardingGuard.test.ts; the two carrying the complaint confirmed failing against the old version-keyed logic before the switch
