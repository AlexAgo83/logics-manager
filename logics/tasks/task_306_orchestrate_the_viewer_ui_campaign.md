## task_306_orchestrate_the_viewer_ui_campaign - Orchestrate the viewer UI campaign
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 16:37:22

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Turn the visual smoke into a reporting campaign: named checks, measured values, no stop at the first defect, still gating.
- [x] 2. Add the layout defect classes at each viewport, with every list derived from the interface.
- [x] 3. Write the runbook: how to run it, how to read it, what the attended pass covers, and where a finding goes.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`
- `item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see`
- `item_617_write_the_campaign_runbook_and_say_where_a_finding_goes`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`. Proof: `keeps running after a failed check, reports every check, and still gates` in `tests/viewer.campaign-report.test.ts`; a full run reports 51 checks with their measured values.
- request-AC2 -> `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`. Proof: the same test injects a failing check and asserts the checks after it still ran and were reported.
- request-AC3 -> `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`. Proof: the same test asserts a non-zero exit; the campaign stays wired into `scripts/ci-check.mjs`.
- request-AC4 -> `item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see`. Proof: the eight tests in `tests/viewer.layout-checks.test.ts`, one per defect class.
- request-AC5 -> `item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see`. Proof: `walks the interface rather than a hand-written list of surfaces` in the same file.
- request-AC6 -> `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`. Proof: `reports viewports it did not sweep rather than silently covering less`; report and captures are written together in the artifacts directory.
- request-AC7 -> `item_617_write_the_campaign_runbook_and_say_where_a_finding_goes`. Proof: `docs/runbooks/viewer-ui-campaign.md`, linked from `docs/README.md` and `docs/development.md`.
- request-AC8 -> `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`. Proof: the headless-DOM and Windows server-only paths record their own checks and skips instead of raising.
- request-AC9 -> every slice. Proof: `tests/viewer.layout-checks.test.ts` (8 tests) and `tests/viewer.campaign-report.test.ts` (2 tests), both new with this request.

# Validation
- (no validation recorded yet)
- command: `npx vitest run && python -m pytest tests/python -q` | result: passed | date: 2026-08-08 | note: 773 vitest + 1073 python passed; campaign green at 51 checks
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`, `item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see`, `item_617_write_the_campaign_runbook_and_say_where_a_finding_goes`
- Related request(s): `req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured`

# AI Context
- Summary: Orchestrate the viewer UI campaign
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured`
- Product brief(s): `prod_057_a_viewer_campaign_that_reports_what_it_saw`
- Architecture decision(s): (none yet)
