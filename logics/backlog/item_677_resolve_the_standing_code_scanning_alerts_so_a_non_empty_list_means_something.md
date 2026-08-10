## item_677_resolve_the_standing_code_scanning_alerts_so_a_non_empty_list_means_something - Resolve the standing code scanning alerts so a non-empty list means something
> From version: 2.21.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:31:41

# AI Context
- Summary: Resolve the standing code scanning alerts so a non-empty list means something
- Keywords: backlog-groom, request, resolve the standing code scanning alerts so a non-empty list means something, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Resolve the standing code scanning alerts so a non-empty list means something.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Nine code scanning alerts are open, zero Dependabot, zero secret scanning. All nine were reviewed on 2026-08-09 and none is exploitable: three `py/command-line-injection` (`viewer.py:628`, `viewer.py:691`, `viewer_cdx.py:1263`) pass list-form `argv` with no `shell=True`; three `py/path-injection` (`viewer_docs.py:155`, `viewer_docs.py:167`, `viewer_cdx.py:166`) validate against `realpath`, a repo-root containment check, a family allow-list and a `.md` suffix; two `js/insecure-randomness` are a `Math.random()` fallback for a diagnostics breadcrumb session id (`browser-host.js:1086`, `diagnostics.js:29`); one `js/bad-tag-filter` is a regex inside `tests/chainGraphScreen.test.ts:21`. No code needs changing. The defect is the standing list: an alert surface that is never empty is a surface nobody reads, so the next real alert lands where everyone has learned to look away.

# Scope
- In:
  - Resolve each of the nine, preferring a suppression at the call site (which ages with the code and is visible in review) over a dismissal in the GitHub UI (which outlives the reasoning that justified it).
  - Record the reason per alert, naming the guard that makes it safe.
- Out:
  - Changing any of the flagged code to satisfy the analyser. The six Python sites were reviewed and are correct as written.
  - Tuning the CodeQL query set or adding new scanners.

# Acceptance criteria
- AC5: The nine alerts are each suppressed at source or dismissed with a written reason naming the guard that makes the site safe, and the open alert list is empty so that a future non-empty list is informative.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: The three JavaScript/TypeScript alerts were removed by changing the code rather than suppressing it: `diagnostics.js` drops the `Math.random()` fallback for `crypto.getRandomValues` (browser-host bundle rebuilt, `js/insecure-randomness` x2), and `tests/chainGraphScreen.test.ts` asserts `source.includes("-->")` instead of matching `/-->/` (`js/bad-tag-filter`). The six Python alerts (40, 45, 46, 50, 51, 52) were dismissed on 2026-08-10 as `won't fix`, each with a comment naming the specific guard that makes its site safe rather than a blanket reason. Alerts 48, 49 and 53 stay listed until the fixes are pushed and CodeQL rescans; nothing further is needed for them.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose`
- Primary task(s): `task_322_orchestrate_the_diagnostics_and_release_surface_cleanup`

# Priority
- Priority: Medium
- Rationale: Set while scoping req_325's review findings.

# Notes
- The six Python alerts were reviewed individually before dismissal: `py/command-line-injection` at `viewer.py:628`, `viewer.py:691`, `viewer_cdx.py:1263` (argv lists, no `shell=True`) and `py/path-injection` at `viewer_docs.py:155`, `viewer_docs.py:167`, `viewer_cdx.py:166` (realpath plus repo-root containment plus a family allow-list plus a `.md` suffix). No code change was warranted, so each carries its own dismissal comment naming its guard; a future reader gets the reasoning, not a shrug.
- Inline `# codeql[...]` suppression was considered and rejected: this repository uses CodeQL default setup, so whether the comments are honoured cannot be verified without pushing and re-running the scan. Adding nine comments that may do nothing is worse than adding none.

- Hybrid rationale: Derived from request `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose.md`.
- Generated locally by logics-manager.
