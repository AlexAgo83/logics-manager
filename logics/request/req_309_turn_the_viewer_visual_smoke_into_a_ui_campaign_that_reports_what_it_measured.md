## req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured - Turn the viewer visual smoke into a UI campaign that reports what it measured
> From version: 2.20.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: A viewer campaign that catches what a green suite cannot see
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- See the delivered viewer the way an operator meets it, across the sizes it is actually used at.
- Read what a campaign measured, not only whether it stopped.
- Catch the defect classes a passing unit suite is blind to: a screen that no longer fits, controls drawn over each other, a surface that is empty with no explanation.
- Cover both the standalone viewer and the extension webview without maintaining two campaigns.

# Context
- Two sibling projects run test campaigns for exactly this. One builds the real window, walks every delivered flow, writes one capture per screen plus a report of every check as passed or failed with the measured value, and exits non-zero so it can gate a delivery. The other drives the real application in a browser across four viewports and captures every view and modal state. Both treat a campaign finding as a workflow slice, not a note in a file.
- This repository already has most of the machinery. The local viewer visual smoke starts the real viewer on an ephemeral port, drives headless Chrome over the debugging protocol with no browser-automation dependency, sweeps three viewports, captures a full-page image per viewport, collects console errors and warnings, and falls back to a headless DOM when no Chrome is present and to a server-only pass on Windows CI. It already runs as one of the checks in the repository check script.
- What it does not do is report. It raises on the first failed step, so a run ends at the first defect and says nothing about the checks that came after. There is no list of what was verified, no measured value beside a verdict, and nothing an operator can read after the fact to tell a real defect from an expectation that has gone stale.
- What it asserts is also thin: that the topbar, the board and the details pane are not empty, and that one navigation path works. Nothing looks at whether controls overlap, whether anything is clipped at the narrow viewport, whether an empty surface explains itself, or whether an action offered by the interface can actually be reached.
- A campaign in one of the sibling projects reported zero findings while a settings form was drawing four rows on top of each other: no assertion looked at overlap, so none failed. That project's rule, learned from a workspace that escaped a guard for a whole request, is that any guard claiming to cover every screen reads its list from the interface rather than from a hand-written enumeration.
- The two surfaces share one source. The viewer client is the single committed source, the asset build copies it into the package payload, and the extension packages the same entry document. A campaign driven against the standalone viewer therefore exercises the interface both surfaces render. The extension-specific boundary is the host contract, which the existing headless DOM tests already cover.
- Captures show the operator's own workflow documents. They are written under the repository's ignored artifacts directory, which is the right place for them, and a capture is therefore a local review artifact rather than something to attach to a commit.

# Acceptance criteria
- AC1: A campaign run reports every check it performed, each with a verdict and the value it measured.
- AC2: A failed check does not end the run; the remaining checks still run and still report.
- AC3: The campaign still gates: a run with any failed check exits non-zero, and the repository check script still fails on it.
- AC4: The campaign asserts the layout defect classes a passing unit suite does not see, at each viewport it sweeps.
- AC5: Any check claiming to cover every screen or every control derives its list from the interface, so a surface added later is covered without editing the check.
- AC6: The captures and the report land together in one place an operator can open after the run.
- AC7: A runbook states how to run the campaign, how to read a failed check, and that a finding becomes a workflow slice.
- AC8: The existing fallbacks keep working: no Chrome present, and the Windows CI server-only pass.
- AC9: Each behavior above leaves behind a test that fails against the current implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_057_a_viewer_campaign_that_reports_what_it_saw`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_038_post_release_viewer_hardening.md
- logics/product/prod_055_say_what_it_does_and_test_what_was_moved.md
- tests/run_local_viewer_visual_smoke.mjs
- scripts/ci-check.mjs
- scripts/build/build-assets.mjs

# AI Context
- Summary: Turn the viewer visual smoke into a UI campaign that reports what it measured
- Keywords: request-chain-scaffold, turn the viewer visual smoke into a ui campaign that reports what it measured, development-ready
- Use when: You need to implement or review the scaffolded workflow for Turn the viewer visual smoke into a UI campaign that reports what it measured.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value`
- `item_616_assert_the_layout_defects_a_passing_unit_suite_cannot_see`
- `item_617_write_the_campaign_runbook_and_say_where_a_finding_goes`
