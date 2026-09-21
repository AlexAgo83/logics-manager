## req_389_review_findings_preserve_annotated_product_references_in_consistency_checks - Review findings: preserve annotated product references in consistency checks
> From version: 2.23.1
> Schema version: 1.0
> Status: Archived
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Review found a regression in parsing annotated product references.
- Keywords: product-consistency, related references, annotations, regression
- Use when: Correcting the multi-reference consistency parser.
- Skip when: Reviewing viewer preference adoption.

# Needs
- P2: Preserve backtick-delimited reference extraction when a related reference has trailing explanatory text, while checking every comma-separated reference.
- Capture this candidate for follow-up; this review does not commit to implementation.

# Context
- Reviewed the uncommitted changes in `logics_manager/insights.py` and their tests, plus commit `8d519e6e` for viewer preference adoption.
- `logics_manager/insights.py:429` strips edge backticks from the whole comma-separated entry. For a value such as `req_example` (refreshed), this retains the closing backtick and annotation in the lookup key.
- `logics/product/prod_004_logics_auto_orchestration_vision.md:4-6` contains this format for request, backlog, and task references. All three annotated targets are reported missing by the changed parser.
- Running the HEAD and working-tree implementations of `product_consistency_payload` against the same corpus gives zero issues before the change and one affected product afterwards.
- `logics-manager product-consistency` reproduces the three false missing-reference reports.
- `node scripts/run-python.mjs -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py tests/python/test_viewer_preferences.py -q`: 265 passed.
- Targeted Ruff checks passed; `git diff --check` passed. The added tests cover plain, backticked, and mixed lists but omit annotations.
- `logics-manager status` and `health --format json` initially reported no open workflow actions and zero health issues.
- No additional actionable finding was established in the reviewed preference-adoption commit. A full repository test run was outside this bounded review.

# Acceptance criteria
- AC1: Annotated backticked references resolve to the identifier inside the backticks for request, backlog, and task metadata.
- AC2: Every reference in plain, backticked, and mixed comma-separated lists remains checked, including a missing or wrong-kind later reference.
- AC3: A regression check includes the existing `(refreshed)` format and the repository product-consistency command no longer reports false missing references for prod_004.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed: preserve the new multi-reference validation; no external dependency is needed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/insights.py`
- `tests/python/test_cli_main.py`
- `logics/product/prod_004_logics_auto_orchestration_vision.md`

# Backlog
- none

# Resolution
- Fixed locally by extracting the first backtick-delimited identifier in each comma-separated entry, falling back to the stripped raw entry.
- ADR 030: the rationale fits at the parser declaration with a regression test; no additional delivery chain is needed.
- AC1/AC2: expanded the existing test to cover annotated request/task references and an annotated later backlog reference, including missing and wrong-kind replacements. The test failed before the fix and passes afterwards.
- Validation: `node scripts/run-python.mjs -m pytest tests/python/test_cli_main.py tests/python/test_flow_cli.py -q` — 236 passed. Targeted Ruff, function-length check, and `git diff --check` passed.
- AC3: `node scripts/run-python.mjs -m logics_manager product-consistency` — 118 product briefs, zero issue signals. The installed `logics-manager` still runs the earlier implementation and reports the old false positive until updated; no installation or release was performed.
