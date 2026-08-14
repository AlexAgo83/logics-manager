## task_350_deliver_the_released_artifact_content_check - Deliver the released-artifact content check
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:39:50

# AI Context
- Summary: Define dev-only first because the other two items are shaped by that answer, then build and inspect proving the check fails on a reintroduced file, then choose the hook with its measured cost stated.
- Keywords: delivery order, dev-only definition first, build and inspect, hook placement, load-bearing proof
- Use when: Implementing the released-artifact content check.
- Skip when: The demo board work, closed under task_340.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Define dev-only first: the other two items are shaped by that answer, and a check written before it would encode a list.
- [x] 2. Then build and inspect, proving the check fails on a reintroduced dev-only file before trusting it.
- [x] 3. Then choose the hook, with the measured cost stated beside the choice.
- [x] 4. Do not audit the current artifacts before the definition exists -- a finding without a rule behind it is an opinion.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_771_define_dev_only_as_a_property_rather_than_a_list`
- `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`
- `item_773_put_the_check_where_a_release_cannot_skip_it`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_771_define_dev_only_as_a_property_rather_than_a_list`. Proof: recorded in `item_771` as a property with both halves stated: a file is dev-only when it exists to build, verify or document the construction of the product **and** no published entry point reads it at runtime. Either half alone is wrong -- the first condemns a bundled output, the second condemns README and LICENSE. Six mechanical predicates decide it, each a statement about where a file lives or how it is produced.
- request-AC6 -> `item_771_define_dev_only_as_a_property_rather_than_a_list`. Proof: the definition classifies and removes nothing. The classifier is only ever pointed at the contents of a built artifact, never at the checkout, and `logics/` and `tests/` are untouched -- the full test suite and the corpus lint both run unchanged after this slice.
- request-AC2 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof: `scripts/check-artifact-contents.mjs` builds and reads back all three: `npm pack --dry-run`, `python -m build`, and the VSIX through the repository's own `packageVsix` -- a bare `vsce` call rejects the scoped package name outright, so it would have inspected an artifact built differently from the released one. Today: npm 119 files, VSIX 154, wheel 115, nothing dev-only.
- request-AC3 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof: the check names the file and the reason it was judged dev-only, and exits 1. A check that says a file must not be there without saying why teaches nothing.
- request-AC5 -> `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`. Proof: proven by adding `tests/webviewHarnessTestUtils.ts` and `logics/INDEX.md` to the npm `files` list: both were reported with their reasons and the process exited 1; removed again, it exits 0.
- request-AC4 -> `item_773_put_the_check_where_a_release_cannot_skip_it`. Proof: each publishing script inspects the artifact it just produced -- `publish-npm.mjs` before `npm publish`, `package-release.mjs` after building the VSIX. That is the last point where the artifact exists and the release has not happened. Cost measured warm rather than estimated: 0.8s, 1.7s and 1.5s, about four seconds for all three, with the VSIX figure sitting on a build the release already pays for. `ci:fast` also runs it, because CI is where it is convenient to find out and the publish path is where it cannot be skipped.

# Validation
- `node scripts/check-artifact-contents.mjs`: all three artifacts built and inspected, nothing dev-only.
- Proven load-bearing by reintroducing two dev-only files into the npm package and observing exit 1 with both reasons named.
- `npx vitest run`: 889 passed. `npm run lint`: clean. A development checkout is unaffected -- the definition classifies, it does not remove.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_771_define_dev_only_as_a_property_rather_than_a_list`, `item_772_build_each_published_artifact_and_inspect_what_is_inside_it`, `item_773_put_the_check_where_a_release_cannot_skip_it`
- Related request(s): `req_353_prove_a_published_artifact_contains_only_the_product`

# Links
- Request: `req_353_prove_a_published_artifact_contains_only_the_product`
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
