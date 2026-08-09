## req_326_review_findings_commands_that_report_failure_and_exit_zero - Review findings: commands that report failure and exit zero
> Indicators reviewed: 2026-08-10 00:10:03

> From version: 2.21.2
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: M
> Theme: Exit-code honesty across the CLI
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context

- Summary: Second review pass, 2026-08-10. Three commands print a failure verdict and exit zero, so a pipeline that trusts the exit status is told the opposite of what the output says. The 2.20.0 fix for `health` was never generalised.
- Keywords: review, exit code, doctor, flow validate, roadmap validate, dispatcher, ci
- Use when: Working on CLI exit statuses, or before relying on any command's status in a pipeline.
- Skip when: You need the diagnostics and release-surface findings — those are `req_325`.

# Needs

- `logics-manager doctor` must exit non-zero when it prints `FAILED`.
- `flow validate` must exit non-zero when it reports blocking findings.
- `flow roadmap validate` must exit non-zero when it prints `FAILED`.
- The `flow` dispatcher should derive the exit status from the payload it already has, instead of naming which two subcommands are allowed to fail.

# Context

Reproduced on `2.21.2` at commit `e0344efd`. Every command below was run twice: once for its output, once discarding output to read `$?`.

- **G1 — `doctor` prints FAILED and exits 0.**
  `logics-manager doctor` -> `Logics doctor: FAILED`, 308 issues, `$? = 0`.
  `logics-manager doctor --format json` -> `"ok": false`, `"issue_count": 308`, `$? = 0`.
  The cause is two sibling branches of the same function, fifteen lines apart:
  `logics_manager/cli.py:575` (the `doctor packaging` branch) ends `return 0 if payload["ok"] else 1`,
  while `logics_manager/cli.py:585` (the plain `doctor` branch) ends with a bare `return 0`.
  This is the exact defect v2.20.0 fixed for `health`, and `logics_manager/cli.py:901` still carries
  the comment recording that change. The release note for it stated the new behaviour was "what
  every other command already did". That claim was not true when it was written, and is still not
  true: `doctor` is the counter-example, and it is the project's headline diagnostic.

- **G2 — `flow validate` reports blocking findings and exits 0.**
  Reproduced by temporarily removing the backlog link from `req_324`:
  `Flow validate: found 2 finding(s).` with both lines prefixed `blocking:`, and `$? = 0`.
  (The document was restored; `git status` is clean.)

- **G3 — `flow roadmap validate` prints FAILED and exits 0.**
  A roadmap doc with no milestones and three missing indicators:
  `Roadmap validation: FAILED`, six issue lines, `$? = 0`.

  G2 and G3 share one cause. `logics_manager/flow/__init__.py:3188-3193` is the whole exit-status
  policy for every `flow` subcommand:

  ```python
  payload = args.func(args)
  if args.command == "validate-closeout" and isinstance(payload, dict) and not payload.get("ok", False):
      return 1
  if args.command == "closeout" and isinstance(payload, dict) and not payload.get("ok", False):
      return 1
  return 0 if isinstance(payload, dict) else 1
  ```

  Two subcommands are named as allowed to fail; every other handler's `ok` field is ignored. Eight
  payload sites in that module set `"ok"` from a real condition (`flow/__init__.py:554`, `:942`,
  `:1835`, `:2120` among them) and only two of them can ever reach the exit code. Adding a new
  validator to `flow` silently inherits "always succeeds" unless someone remembers to extend this
  list.

- **Interaction with work already scoped.** `item_676` proposes running the full `doctor` in CI, and
  its AC says a corpus that fails it fails the build. That is not achievable until G1 is fixed: the
  step would be added, `doctor` would print `FAILED`, and CI would stay green. G1 should land before
  `item_676`, or `item_676` should absorb it.

Observed but not proposed as work:

- The final line of the dispatcher, `return 0 if isinstance(payload, dict) else 1`, exits non-zero
  for any handler that returns something other than a dict. All 26 `cmd_*` handlers currently return
  dicts, so nothing is broken today; it is a trap for the next handler, not a live defect.
- `config`, `view`, `status`, and `search` also end in a bare `return 0` (`cli.py:558`, `:816`,
  `:888`, `:962`). These are informational commands with no failure verdict to report, so zero is
  the right answer for them.
- `lint`, `audit`, and `health` were checked and are correct: each exits non-zero on its own bad
  verdict, which is why `npm run ci:check` does catch corpus regressions today.

# Acceptance criteria

- AC1: `logics-manager doctor` exits non-zero whenever it prints `FAILED` or reports `"ok": false`, in both text and json formats, with a regression test.
- AC2: `flow validate` exits non-zero when it reports at least one blocking finding, and stays zero for deferred or warning-level findings only.
- AC3: `flow roadmap validate` exits non-zero when it prints `FAILED`.
- AC4: The `flow` dispatcher derives the exit status from `payload["ok"]` for every subcommand that publishes one, instead of naming individual subcommands, so a new validator is honest by default.
- AC5: A test asserts the general rule — for each `flow` subcommand that publishes `ok`, a payload with `ok: false` produces a non-zero exit — rather than testing the two or three commands fixed here.
- AC6: `logics-manager health`, `lint`, and `audit` keep their current exit behaviour, proven by the same test.

# Definition of Ready (DoR)

- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Scope

- In: exit statuses for `doctor`, `flow validate`, `flow roadmap validate`, and the `flow` dispatcher policy that produced the last two.
- Out: `config`, `view`, `status`, `search` — informational commands with no failure verdict.
- Out: everything in `req_325`, except that `item_676` must not land before AC1.

# Risks

- AC4 changes the exit status of every `flow` subcommand that publishes `ok: false` today, not only the three named here. Some caller — a script, a hook, the VS Code client — may be relying on a zero exit while reading the payload. The change is correct and matches what v2.20.0 already did to `health`, but it is a breaking change and belongs in a minor version with a release note, not a patch.
- Making `flow validate` exit non-zero on blocking findings will turn currently-green local workflows red at the moment they are already blocked. That is the point, but it will be felt.

# Companion docs

- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References

- `logics_manager/cli.py`
- `logics_manager/flow/__init__.py`
- `tests/python/test_logics_manager_cli.py`
- Related: `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose`
- Related: `item_676_run_the_full_logics_manager_doctor_in_ci`

# Backlog
- `item_679_make_doctor_exit_non_zero_when_it_reports_failed`
- `item_680_derive_flow_exit_statuses_from_the_payload_instead_of_an_allow_list`
