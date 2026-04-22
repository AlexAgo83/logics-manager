import { spawnSync } from "node:child_process";

const [, , firstArg, secondArg, ...restArgs] = process.argv;

if (!firstArg) {
  console.error("Usage: node scripts/run-python.mjs <script-path> [...args] or node scripts/run-python.mjs -m <module> [...args]");
  process.exit(1);
}

const invocation =
  firstArg === "-m" || firstArg === "--module"
    ? {
        commandTarget: secondArg,
        argsPrefix: secondArg ? ["-m", secondArg] : null,
        scriptArgs: restArgs
      }
    : {
        commandTarget: firstArg,
        argsPrefix: [firstArg],
        scriptArgs: [secondArg, ...restArgs].filter((value) => typeof value === "string" && value.length > 0)
      };

if (!invocation.commandTarget || !invocation.argsPrefix) {
  console.error("Usage: node scripts/run-python.mjs <script-path> [...args] or node scripts/run-python.mjs -m <module> [...args]");
  process.exit(1);
}

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
  const version = resolvePythonVersion(candidate.command, candidate.argsPrefix);
  if (!version) {
    continue;
  }
  if (!isSupportedPythonVersion(version)) {
    continue;
  }

  const result = spawnSync(candidate.command, [...candidate.argsPrefix, ...invocation.argsPrefix, ...invocation.scriptArgs], {
    stdio: "inherit"
  });
  if (result.status === 0) {
    process.exit(0);
  }
  if (isMissingCommandError(result.error)) {
    continue;
  }
  process.exit(result.status ?? 1);
}

console.error(
  process.platform === "win32"
    ? "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3`, `python`, or `py` is available on PATH."
    : "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3` or `python` is available on PATH."
);
process.exit(1);

function isMissingCommandError(error) {
  const detail = `${error?.message || ""}\n${error?.stderr || ""}\n${error?.stdout || ""}`.toLowerCase();
  return (
    detail.includes("enoent") ||
    detail.includes("not recognized as an internal or external command") ||
    detail.includes("command not found") ||
    detail.includes("python was not found") ||
    detail.includes("cannot find the file specified")
  );
}

function resolvePythonVersion(command, argsPrefix) {
  const result = spawnSync(command, [...argsPrefix, "--version"], {
    encoding: "utf8"
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const versionText = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const match = versionText.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10)
  };
}

function isSupportedPythonVersion(version) {
  return version.major > 3 || (version.major === 3 && version.minor >= 10);
}
