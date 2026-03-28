import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const pythonInvocation = resolvePythonInvocation();

const steps = [
  {
    label: "Logics docs lint (strict status)",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "logics/skills/logics-doc-linter/scripts/logics_lint.py", "--require-status"]
  },
  {
    label: "Workflow audit (blocking, grouped)",
    command: pythonInvocation.command,
    args: [
      ...pythonInvocation.argsPrefix,
      "logics/skills/logics-flow-manager/scripts/workflow_audit.py",
      "--legacy-cutoff-version",
      "1.1.0",
      "--group-by-doc"
    ]
  },
  {
    label: "Workflow audit (JSON report)",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "logics/skills/logics-flow-manager/scripts/workflow_audit.py", "--format", "json"]
  },
  {
    label: "Logics kit Python tests",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "-m", "unittest", "discover", "-s", "logics/skills/tests", "-p", "test_*.py", "-v"]
  },
  {
    label: "Logics kit CLI smoke checks",
    command: pythonInvocation.command,
    args: [...pythonInvocation.argsPrefix, "logics/skills/tests/run_cli_smoke_checks.py"]
  },
  { label: "Compile", command: npmCommand(), args: ["run", "compile"] },
  { label: "Lint", command: npmCommand(), args: ["run", "lint"] },
  { label: "Unit tests", command: npmCommand(), args: ["run", "test"] },
  { label: "Extension smoke checks", command: npmCommand(), args: ["run", "test:smoke"] },
  { label: "Logics docs lint", command: npmCommand(), args: ["run", "lint:logics"] },
  { label: "VSIX package validation", command: npmCommand(), args: ["run", "package:ci"] }
];

runStep("Logics docs lint (strict status)", steps[0].command, steps[0].args);

const requestSnapshot = captureRequestSnapshot();
runStep(
  "Logics flow sync close-eligible requests",
  pythonInvocation.command,
  [...pythonInvocation.argsPrefix, "logics/skills/logics-flow-manager/scripts/logics_flow.py", "sync", "close-eligible-requests"]
);
ensureRequestsUnchanged(requestSnapshot);

for (const step of steps.slice(1)) {
  if (step.label === "Logics docs lint (strict status)") {
    continue;
  }
  runStep(step.label, step.command, step.args);
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
      cwd: repoRoot,
      stdio: "ignore"
    });
    if (result.status === 0) {
      return candidate;
    }
  }
  console.error("Python 3 interpreter not found. Install Python 3 and ensure a supported launcher is available on PATH.");
  process.exit(1);
}

function runStep(label, command, args) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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
