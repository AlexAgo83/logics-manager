import { spawn, spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PYTHON_COVERAGE_FLOOR, evaluateCoverageFloor } from "./coverage-floor.mjs";

const repoRoot = process.cwd();
const pythonInvocation = resolvePythonInvocation();
const updateRequested = process.argv.includes("--update");

const steps = [
  {
    label: "Logics docs lint (strict status)",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "-m", "logics_manager", "lint", "--require-status"]
  },
  {
    label: "Workflow audit (blocking, grouped)",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "-m", "logics_manager", "audit", "--legacy-cutoff-version", "1.1.0", "--group-by-doc"]
  },
  {
    label: "Workflow audit (JSON report)",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "-m", "logics_manager", "audit", "--format", "json"]
  },
  { label: "README badge metadata drift check", command: npmCommand(), args: ["run", "docs:check"] },
  { label: "npm audit policy", command: npmCommand(), args: ["run", "audit:ci"] },
  {
    label: "Python lint",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "-m", "ruff", "check", "logics_manager", "tests/python", "scripts"]
  },
  {
    label: "Python function-length ceiling",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "scripts/check_function_length.py"]
  },
  {
    // Coverage tooling was installed in CI under a step named for it, then never
    // invoked: no Python coverage existed while the step name claimed otherwise.
    // `checkPythonCoverageFloor()` reads the data this run writes, below.
    label: "Logics manager CLI tests",
    command: pythonInvocation.command,
    args: [
      ...pythonInvocation.argsPrefix,
      "-m", "coverage", "run", "--source=logics_manager", "-m", "pytest", "tests/python/", "-q"
    ]
  },
  { label: "Viewer browser-host bundle freshness", command: npmCommand(), args: ["run", "check:viewer-host"] },
  { label: "Compile", command: npmCommand(), args: ["run", "compile"] },
  { label: "Lint", command: npmCommand(), args: ["run", "lint"] },
  { label: "Unit tests + coverage", command: npmCommand(), args: ["run", "test:coverage"] },
  { label: "Local viewer visual smoke", command: npmCommand(), args: ["run", "test:viewer-smoke"] },
  { label: "Extension smoke checks", command: npmCommand(), args: ["run", "test:smoke"] },
  { label: "npm CLI smoke checks", command: npmCommand(), args: ["run", "test:npm-cli"] },
  { label: "Logics docs lint", command: npmCommand(), args: ["run", "lint:logics"] },
  { label: "VSIX package validation", command: npmCommand(), args: ["run", "package:ci"] }
];

// viewer_assets is generated, not committed (req_285): regenerate it from the
// canonical sources before any asset/lint gate so a fresh CI checkout has it.
runStep("Generate viewer assets", npmCommand(), ["run", "build:assets"]);
// item_678: the aggregated CHANGELOG.md is generated from changelogs/, so it can go stale
// exactly one release after it was written. This is the step that notices.
runStep("Changelog is current", npmCommand(), ["run", "check:changelog"]);

runStep("Logics docs lint (strict status)", steps[0].command, steps[0].args);
runStep(
  "Python packaging metadata check",
  pythonInvocation.command,
  [...pythonInvocation.argsPrefix, "-m", "logics_manager", "doctor", "packaging", "--metadata-only"]
);


const requestSnapshot = captureRequestSnapshot();
runStep(
  "Logics flow sync close-eligible requests",
  pythonInvocation.command,
  [...pythonInvocation.argsPrefix, "-m", "logics_manager", "sync", "close-eligible-requests"]
);
ensureRequestsUnchanged(requestSnapshot);

// The pytest suite touches nothing the node steps touch, so it runs in the
// background while they proceed serially; its buffered output is replayed at
// the end. It must still start here, after the sync/snapshot gate above.
let backgroundStep = null;
for (const step of steps.slice(1)) {
  if (step.label === "Logics docs lint (strict status)") {
    continue;
  }
  if (step.label === "Logics manager CLI tests") {
    console.log(`\n==> ${step.label} (running in background)`);
    backgroundStep = startBackgroundStep(step.label, step.command, step.args);
    continue;
  }
  runStep(step.label, step.command, step.args);
}
if (backgroundStep) {
  const result = await backgroundStep;
  console.log(`\n==> ${result.label} (background output)`);
  process.stdout.write(result.output);
  if (result.code !== 0) {
    process.exit(result.code ?? 1);
  }
  // Only meaningful once the suite above has finished writing coverage data,
  // which is why it lives here and not in the step list.
  checkPythonCoverageFloor();
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolvePythonInvocation() {
  const candidates =
    process.platform === "win32"
      ? [
          { command: "python3", argsPrefix: [] },
          { command: "python", argsPrefix: [] },
          { command: "py", argsPrefix: ["-3"] },
          { command: "py", argsPrefix: [] }
        ]
      : [
          { command: "python3", argsPrefix: [] },
          { command: "python", argsPrefix: [] }
        ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.argsPrefix, "--version"], {
      encoding: "utf8",
      cwd: repoRoot
    });
    if (result.status === 0 && isSupportedPythonVersion(result.stdout, result.stderr)) {
      return candidate;
    }
  }
  console.error("Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure a supported launcher is available on PATH.");
  process.exit(1);
}

function isSupportedPythonVersion(stdout, stderr) {
  const versionText = `${stdout || ""}\n${stderr || ""}`.trim();
  const match = versionText.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    return false;
  }
  const major = Number.parseInt(match[1], 10);
  const minor = Number.parseInt(match[2], 10);
  return major > 3 || (major === 3 && minor >= 10);
}

function startBackgroundStep(label, command, args) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32" && command.startsWith("npm")
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  return new Promise((resolveStep) => {
    child.on("error", (error) => resolveStep({ label, code: 1, output: `${output}\n${error}` }));
    child.on("close", (code) => resolveStep({ label, code, output }));
  });
}

function runStep(label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && command.startsWith("npm")
  });
  if (result.status !== 0) {
    if (result.error) {
      console.error(result.error);
    }
    process.exit(result.status ?? 1);
  }
}

function checkPythonCoverageFloor() {
  console.log("\n==> Python coverage floor");
  const result = spawnSync(
    pythonInvocation.command,
    [...pythonInvocation.argsPrefix, "-m", "coverage", "report", "--format=total"],
    { cwd: repoRoot, encoding: "utf8" }
  );
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
    const verb = updateRequested ? "Raised" : "Raisable";
    console.log(`[coverage-floor] ${verb}: ${evaluation.message}`);
    if (updateRequested) {
      raiseCoverageFloor(measured);
    } else {
      console.log("Run `node scripts/ci-check.mjs --update` to write the higher floor back.");
    }
    return;
  }
  console.log(`[coverage-floor] ${evaluation.message}`);
}

function raiseCoverageFloor(measured) {
  const coverageFloorPath = fileURLToPath(new URL("./coverage-floor.mjs", import.meta.url));
  let source = readFileSync(coverageFloorPath, "utf8");
  source = source.replace(/export const PYTHON_COVERAGE_FLOOR = \d+;/, `export const PYTHON_COVERAGE_FLOOR = ${measured};`);
  writeFileSync(coverageFloorPath, source);
}

function captureRequestSnapshot() {
  const requestRoot = join(repoRoot, "logics", "request");
  return new Map(walkFiles(requestRoot).map((filePath) => [relative(repoRoot, filePath), readFileSync(filePath, "utf8")]));
}

function ensureRequestsUnchanged(beforeSnapshot) {
  console.log("\n==> Ensure requests unchanged after sync");
  const afterSnapshot = captureRequestSnapshot();
  const changed = [];
  const paths = new Set([...beforeSnapshot.keys(), ...afterSnapshot.keys()]);
  for (const relPath of Array.from(paths).sort()) {
    if ((beforeSnapshot.get(relPath) || null) !== (afterSnapshot.get(relPath) || null)) {
      changed.push(relPath);
    }
  }
  if (changed.length === 0) {
    return;
  }
  console.error("close-eligible-requests modified request files:");
  for (const relPath of changed) {
    console.error(`- ${relPath}`);
  }
  process.exit(1);
}

function walkFiles(directory) {
  const stats = statSync(directory, { throwIfNoEntry: false });
  if (!stats || !stats.isDirectory()) {
    return [];
  }
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}
