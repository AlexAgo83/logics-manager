// req_323/item_670, extended for the split CI workflow: the same coverage-floor
// ratchet ci-check.mjs runs locally, as its own CI step so python-tests can
// check it right after the pytest run that wrote the coverage data, without
// pulling in ci-check.mjs's whole serial step list.
import { spawnSync } from "node:child_process";
import { evaluateCoverageFloor } from "./coverage-floor.mjs";

const PYTHON_COVERAGE_FLOOR = 77;

const result = spawnSync("node", ["scripts/run-python.mjs", "-m", "coverage", "report", "--format=total"], {
  cwd: process.cwd(),
  encoding: "utf8"
});
if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}
const measured = Number.parseInt(result.stdout.trim(), 10);
if (Number.isNaN(measured)) {
  console.error(`[coverage-floor] could not parse a percentage from: ${result.stdout.trim()}`);
  process.exit(1);
}
const evaluation = evaluateCoverageFloor(measured, PYTHON_COVERAGE_FLOOR);
if (evaluation.status === "fail") {
  console.error(`[coverage-floor] ${evaluation.message}`);
  process.exit(1);
}
if (evaluation.status === "raisable") {
  console.log(`[coverage-floor] Raisable: ${evaluation.message} Run \`node scripts/ci-check.mjs --update\` locally to write it back.`);
} else {
  console.log(`[coverage-floor] ${evaluation.message}`);
}
