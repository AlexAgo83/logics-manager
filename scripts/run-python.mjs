import { execFileSync } from "node:child_process";

const [, , scriptPath, ...scriptArgs] = process.argv;

if (!scriptPath) {
  console.error("Usage: node scripts/run-python.mjs <script-path> [...args]");
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
  try {
    execFileSync(candidate.command, [...candidate.argsPrefix, scriptPath, ...scriptArgs], {
      stdio: "inherit"
    });
    process.exit(0);
  } catch (error) {
    if (isMissingCommandError(error)) {
      continue;
    }
    process.exit(error?.status ?? 1);
  }
}

console.error(
  process.platform === "win32"
    ? "Python 3 interpreter not found. Install Python 3 and ensure `python3`, `python`, or `py` is available on PATH."
    : "Python 3 interpreter not found. Install Python 3 and ensure `python3` or `python` is available on PATH."
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
