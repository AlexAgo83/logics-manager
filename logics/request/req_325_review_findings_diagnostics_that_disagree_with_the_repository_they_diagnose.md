## req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose - Review findings: diagnostics that disagree with the repository they diagnose
> Indicators reviewed: 2026-08-10 00:00:29

> From version: 2.21.2
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: M
> Theme: Diagnostics, CI coverage, and release surface
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context

- Summary: Review of the repository on 2026-08-09. Four findings, all about diagnostics or published surfaces that report something other than the truth of this repository. Candidates only; none is committed work.
- Keywords: review, doctor, schema version, CI coverage, CodeQL, changelog, duplicate executables, environment_warnings
- Use when: Deciding what to fix next in the diagnostics, CI, or release surface.
- Skip when: You need the roadmap generation defects — those are `req_324`.

# Needs

- F1: `doctor` must stop reporting a single npm install as a duplicate.
- F2: `doctor` must either pass on this repository or run in CI so its failure is a decision rather than a surprise.
- F3: The code scanning alert list must reflect real risk, so that a non-empty list means something.
- F4: The published packages should carry the release notes that already exist.

# Context

Commands run and their real output, all on `2.21.2` at commit `085341d3`:

- **F1 — `doctor` reports the only install as a duplicate. Reproducible, cause identified.**
  `logics-manager doctor --format json` returns, in `environment_warnings`:
  `"message": "Several logics-manager executables are on PATH: /Users/<user>/.local/npm-global/bin/logics-manager"`,
  with `"path": ".../node_modules/@grifhinz/logics-manager/scripts/logics-manager.py"`.
  There is exactly one install; `type -a logics-manager` lists one distinct file.
  Cause: `running_executable_path()` (`logics_manager/cli.py:269`) reads `sys.argv[0]`, which
  inside the spawned Python process is `scripts/logics-manager.py`. The PATH entry resolves to
  `scripts/npm/logics-manager.mjs`, the Node wrapper. The two paths never compare equal, so
  `shadowing_executables()` (`logics_manager/cli.py:341`) classifies the one true install as a
  shadow of itself. Every npm install sees this warning permanently.
  Impact beyond noise: the remediation text advises `npm uninstall -g @grifhinz/logics-manager`,
  which would remove the user's only install. This session began with an operator acting on this
  warning; they did have a real duplicate, and the warning persisted after removing it.
  A calibration check that already exists elsewhere in the file — `_find_executable_paths` dedups
  by resolved path — is the shape the fix wants: compare install roots, not entry-point files.

- **F2 — `doctor` fails on this repository, and CI never runs it.**
  `logics-manager doctor` exits `FAILED` with 308 `missing_schema_version` findings.
  `logics-manager sync schema-status`: `1311 workflow doc(s) scanned. (missing): 308, 1.0: 1003`
  — 23% of the corpus. CI runs `doctor packaging --metadata-only` only
  (`.github/workflows/ci.yml:45`, `scripts/ci-check.mjs:69`), so `npm run ci:check` is green while
  the full `doctor` is red. The affected docs are the oldest (`req_000` … `req_009` and on),
  written before schema versioning existed (`item_123`).
  Either outcome is defensible — backfill the indicator, or declare pre-schema docs exempt — but
  the current state is the one that teaches nothing: the project's own reference corpus fails its
  own flagship diagnostic, and the pipeline is arranged so nobody finds out.

- **F3 — nine open code scanning alerts, all triaged as non-issues.**
  `gh api repos/<owner>/<repo>/code-scanning/alerts` returns 9 open, 0 dependabot, 0 secret
  scanning. Reviewed individually on 2026-08-09:
  three `py/command-line-injection` (`viewer.py:628`, `viewer.py:691`, `viewer_cdx.py:1263`) all
  use list-form `argv` with no `shell=True`; three `py/path-injection` (`viewer_docs.py:155`,
  `viewer_docs.py:167`, `viewer_cdx.py:166`) all validate against `realpath` plus a repo-root
  containment check plus an allow-list of families and a `.md` suffix; two
  `js/insecure-randomness` are a `Math.random()` fallback for a diagnostics breadcrumb session id
  (`browser-host.js:1086`, `diagnostics.js:29`); one `js/bad-tag-filter` is a regex in
  `tests/chainGraphScreen.test.ts:21`.
  No fix is needed in the code. The finding is that a permanently non-empty alert list stops being
  read, so the next real alert arrives into a surface everyone has learned to ignore.

- **F4 — the release notes are not in the packages.**
  There is no `CHANGELOG.md` in the repository, and `package.json:25` `files` does not ship one.
  `gh release list` shows fifteen releases whose notes are written in detailed prose, including
  breaking-change callouts (v2.20.0's `health` exit-code change). None of that reaches an npm or
  PyPI reader, who sees a version number and no history. The material already exists; only the
  publishing path is missing.

Observed but not proposed as work:

- `npm run ci:check` reports `[coverage-floor] Raisable: measured 77% > recorded floor 76%.` This
  is not a finding: `req_323`/`item_670` replaced the old rubber-stamp floor with a ratchet, and
  the message is that ratchet working as designed. Running `node scripts/ci-check.mjs --update`
  banks the point; nothing is broken if it waits.

- `logics_manager/viewer.py` is 3411 lines, still the largest module after `req_311` and `req_312`
  lifted its sub-systems out (5692 → 3411). The line-budget ratchet
  (`scripts/check-source-line-budget.mjs:84`) records the ceiling and the reason per file, and it
  passes. This is a documented trade-off being actively worked, not a defect.
- The corpus holds 322 requests, 672 backlog items, and 314 tasks with `open workflow docs: 0`.
  Whether that volume should be archived is a product judgement, not a review finding.
- Three roadmap generation defects found the same day are already captured in `req_324`; they are
  not repeated here.

# Acceptance criteria

- AC1: On a machine with exactly one npm install of `logics-manager`, `doctor` reports no `duplicate_executables` warning, and a regression test covers the npm-wrapper case where `sys.argv[0]` is the spawned Python entry point.
- AC2: With two genuine installs present, `doctor` still reports the duplicate — the fix narrows the check without disabling it.
- AC3: `logics-manager doctor` exits zero on this repository, either because the 308 pre-schema docs carry a schema version or because a documented exemption covers them.
- AC4: CI runs the full `logics-manager doctor`, so its verdict cannot silently diverge from the pipeline's again.
- AC5: The nine open code scanning alerts are each dismissed with a written reason or suppressed at their source, leaving an alert list whose non-emptiness is informative.
- AC6: A `CHANGELOG.md` exists, is listed in `package.json` `files`, and carries the notes for at least the 2.15 through 2.21 releases.

# Definition of Ready (DoR)

- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope

- In: the four findings above, each independently deliverable.
- Out: any code change to the six Python alerts in F3 — they were reviewed and are correct as written.
- Out: splitting `viewer.py`, archiving the corpus, and the `req_324` generation defects.

# Risks

- AC3 has two valid answers with different costs. Backfilling 308 documents touches a quarter of the corpus in one commit; an exemption is cheaper but hides the oldest docs from a check they would otherwise fail forever. The choice belongs to scoping, not to this request.
- AC5 records a security judgement in a durable place. If any of the six Python alerts is dismissed and the surrounding code later changes, the dismissal outlives the reasoning that justified it. Suppression comments at the call site age better than a dismissal in the GitHub UI.

# Companion docs

- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References

- `logics_manager/cli.py`
- `logics_manager/doctor.py`
- `scripts/ci-check.mjs`
- `.github/workflows/ci.yml`
- `package.json`
- `scripts/check-source-line-budget.mjs`
- Related: `req_324_make_generated_roadmap_docs_pass_the_audit_they_are_generated_for`

# Backlog
- `item_674_stop_doctor_reporting_a_single_npm_install_as_a_duplicate_of_itself`
- `item_675_backfill_schema_version_on_the_pre_schema_workflow_docs`
- `item_676_run_the_full_logics_manager_doctor_in_ci`
- `item_677_resolve_the_standing_code_scanning_alerts_so_a_non_empty_list_means_something`
- `item_678_publish_a_changelog_built_from_the_existing_release_notes`

- none
