## item_615_make_the_viewer_campaign_report_every_check_with_its_measured_value - Make the viewer campaign report every check with its measured value
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Readable campaign output
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The visual smoke raises on the first failed step, so one defect hides every check that would have run after it, and a reviewer learns one fact per run.
- Its steps are inline statements rather than named checks, so there is no list of what was verified and no measured value to read beside a verdict. A reviewer cannot tell a real defect from an expectation that has gone stale, which is the judgement a campaign exists to support.

# Scope
- In:
  - Give each check a name and a measured value, and record its verdict instead of ending the run.
  - Write a report listing every check with its verdict and measured value, followed by the findings.
  - Keep the run gating: exit non-zero when any check failed, so the repository check script still fails on it.
  - Place the report beside the captures, in the ignored artifacts directory the run already uses.
  - Keep the existing fallbacks intact: the headless-DOM path when no Chrome is present, and the server-only pass on Windows CI.
  - Distinguish a failed check from a check that could not run, so a missing prerequisite does not read as a defect.
- Out:
  - Changing which viewports are swept.
  - Adding new assertions, which is the next slice.
  - Replacing the debugging-protocol driver with a browser-automation framework.
  - Comparing captures against golden images.

# Acceptance criteria
- AC1: A run reports every check performed, each with a verdict and the value it measured.
- AC2: A failed check does not end the run; the checks after it still run and appear in the report.
- AC3: A run with any failed check exits non-zero and fails the repository check script, as the smoke does today.
- AC4: The report and the captures land in the same directory, written on both a passing and a failing run.
- AC5: A check that could not run is reported as such, distinctly from a check that failed.
- AC6: The headless-DOM fallback and the Windows CI server-only pass still produce a report.
- AC7: A test drives a deliberately failing check and asserts the later checks still ran and were reported.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `keeps running after a failed check, reports every check, and still gates` in `tests/viewer.campaign-report.test.ts`; `artifacts/local-viewer-smoke/report.txt` lists 51 checks with their measured values.
- request-AC2 -> This backlog slice. Proof: the same test asserts the checks after the injected failure still ran and were reported.
- request-AC3 -> This backlog slice. Proof: the same test asserts a non-zero exit; the campaign stays wired into `scripts/ci-check.mjs`.
- request-AC6 -> This backlog slice. Proof: `reports viewports it did not sweep rather than silently covering less` in the same file.
- request-AC8 -> This backlog slice. Proof: the headless-DOM and server-only paths record their own checks and skips rather than raising.
- request-AC9 -> This backlog slice. Proof: both tests in `tests/viewer.campaign-report.test.ts`.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_057_a_viewer_campaign_that_reports_what_it_saw`
- Architecture decision(s): (none yet)
- Request: `req_309_turn_the_viewer_visual_smoke_into_a_ui_campaign_that_reports_what_it_measured`
- Primary task(s): `task_306_orchestrate_the_viewer_ui_campaign`

# AI Context
- Summary: Make the viewer campaign report every check with its measured value
- Keywords: scaffolded-backlog, make the viewer campaign report every check with its measured value, implementation-ready
- Use when: Implementing the scaffolded slice for Make the viewer campaign report every check with its measured value.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a run that stops at the first defect cannot be reviewed
- Rationale: Set by scaffold input or defaulted for grooming.
