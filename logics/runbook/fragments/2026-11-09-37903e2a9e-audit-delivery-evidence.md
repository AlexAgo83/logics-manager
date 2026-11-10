# Mission 37903e2a9e: lifecycle-aware audit evidence

The example-project report described 38 blocking audit findings on abandoned tasks and
requests delivered by automated missions without Logics tasks. The remote corpus
is not available in this checkout; regression fixtures reproduce both cases.

Obsolete documents now retain structural validation without delivery gates,
traceability or automatic proof/gate repairs. References to them still resolve,
but abandoned work cannot supply delivery evidence. Schema validation stays in
lint and therefore in flow validate.

For an explicitly Done request, the conservative evidence contract is a valid
row in its own Executions table with state merged and a nonempty valid PR URL.
The audit trusts the recorded state without contacting the PR host. This replaces
the request's implementation-chain and DoR requirements; active documents retain
their existing checks. Health has independent status/progress checks and needs
no change.

Validation covers lifecycle statuses, missing/invalid evidence, existing chains,
product references, structural failures and repairs that must preserve abandoned
documents. All local validation commands are timed by the supplied mission runner.
The first targeted run exposed an obsolete repair target and an outdated test
expectation, both corrected. Local test adapters under .mission-artifacts expose
the prepared Chromium and preserve mission Git routing only for this checkout,
so temporary fixture repositories do not inherit the read-only mission repository.
The isolated Git snapshot has no remote; the adapter supplies the public origin
declared in package.json as a process-only Git option for viewer smoke checks.
Neither adapter changes product code or test assertions. Full required GitHub CI
on the merged commit remains mandatory.

The final focused audit/execution regression run passed all 202 tests. The full
CI command passed audit, compilation, lint and both 1,026-test JavaScript coverage
campaigns, then failed the viewer smoke check `desktop: ci: reachable` after
retries. The UI and its smoke assertions were left unchanged. An initial
standalone Python coverage run passed 1,724 tests, skipped one and timed out in
two viewer HTTP tests; a standalone retry and the remaining packaging checks
are recorded separately in the mission timer receipts.

The standalone retry passed all 1,726 Python tests with one skip and 80% coverage,
above the unchanged 78% floor. Extension and npm CLI smoke checks, Logics lint,
VSIX packaging, and Python wheel/sdist builds also passed. The only remaining
failure is `desktop: ci: reachable`; required GitHub CI must be green before merge.
Recheck the 38 reported findings against the actual example-project corpus and review
that each recorded merged PR covers the Done request's acceptance criteria.
