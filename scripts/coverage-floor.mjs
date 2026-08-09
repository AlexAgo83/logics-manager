// req_323/item_670: the pure comparison behind the Python coverage floor
// check in ci-check.mjs, split out only so it is unit-testable without
// spawning `coverage`/python as a subprocess - the ratchet's own logic
// (fail below, raisable above), modeled on the line-budget ledger (item_626).
//
// The recorded floor lives here, not duplicated in each caller
// (ci-check.mjs's local run, check-python-coverage-floor.mjs's split-CI
// job) - `node scripts/ci-check.mjs --update` writes a raise back here.
export const PYTHON_COVERAGE_FLOOR = 77;

export function evaluateCoverageFloor(measured, floor) {
  if (measured < floor) {
    return { status: "fail", message: `${measured}% is below the recorded floor of ${floor}%.` };
  }
  if (measured > floor) {
    return { status: "raisable", message: `measured ${measured}% > recorded floor ${floor}%.` };
  }
  return { status: "ok", message: `${measured}% meets the recorded floor of ${floor}%.` };
}
