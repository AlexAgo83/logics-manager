import { execFile } from "child_process";

export type PythonCommand = {
  command: string;
  argsPrefix: string[];
  displayLabel: string;
};

type ExecResult = {
  stdout: string;
  stderr: string;
  error?: Error;
};

let resolvedPythonCommandPromise: Promise<PythonCommand | null> | undefined;

export function getPythonCommandCandidates(platform: NodeJS.Platform = process.platform): PythonCommand[] {
  if (platform === "win32") {
    return [
      { command: "python3", argsPrefix: [], displayLabel: "python3" },
      { command: "python", argsPrefix: [], displayLabel: "python" },
      { command: "py", argsPrefix: ["-3"], displayLabel: "py -3" },
      { command: "py", argsPrefix: [], displayLabel: "py" }
    ];
  }

  return [
    { command: "python3", argsPrefix: [], displayLabel: "python3" },
    { command: "python", argsPrefix: [], displayLabel: "python" }
  ];
}

export function isMissingPythonFailureDetail(detail: string): boolean {
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("python was not found") ||
    normalized.includes("is not recognized as an internal or external command") ||
    normalized.includes("not found") ||
    normalized.includes("no such file or directory") ||
    normalized.includes("cannot find the file specified")
  );
}

export function buildMissingPythonMessage(platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    return "Python 3 interpreter not found. Install Python 3 and ensure `python3`, `python`, or `py` is available on PATH, then retry.";
  }
  return "Python 3 interpreter not found. Install Python 3 and ensure `python3` or `python` is available on PATH, then retry.";
}

export async function runPythonCommand(cwd: string, scriptPath: string, args: string[]): Promise<ExecResult> {
  const command = await resolvePythonCommand();
  if (!command) {
    const message = buildMissingPythonMessage();
    return {
      error: new Error(message),
      stdout: "",
      stderr: message
    };
  }

  let result = await execFileWithOutput(command.command, [...command.argsPrefix, scriptPath, ...args], cwd);
  if (result.error && isMissingPythonError(result)) {
    resolvedPythonCommandPromise = undefined;
    const fallback = await resolvePythonCommand();
    if (fallback && !isSamePythonCommand(command, fallback)) {
      result = await execFileWithOutput(fallback.command, [...fallback.argsPrefix, scriptPath, ...args], cwd);
    } else if (!result.stderr.trim()) {
      result = {
        ...result,
        stderr: buildMissingPythonMessage()
      };
    }
  }

  return result;
}

async function resolvePythonCommand(): Promise<PythonCommand | null> {
  if (!resolvedPythonCommandPromise) {
    resolvedPythonCommandPromise = detectPythonCommand();
  }
  return resolvedPythonCommandPromise;
}

async function detectPythonCommand(): Promise<PythonCommand | null> {
  for (const candidate of getPythonCommandCandidates()) {
    const result = await execFileWithOutput(candidate.command, [...candidate.argsPrefix, "--version"]);
    if (!result.error) {
      return candidate;
    }
  }
  return null;
}

function execFileWithOutput(command: string, args: string[], cwd?: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(command, args, cwd ? { cwd } : undefined, (error, stdout, stderr) => {
      resolve({
        error: error ?? undefined,
        stdout: typeof stdout === "string" ? stdout : String(stdout ?? ""),
        stderr: typeof stderr === "string" ? stderr : String(stderr ?? "")
      });
    });
  });
}

function isMissingPythonError(result: ExecResult): boolean {
  const detail = `${result.stderr}\n${result.stdout}\n${result.error?.message || ""}`;
  return isMissingPythonFailureDetail(detail);
}

function isSamePythonCommand(left: PythonCommand, right: PythonCommand): boolean {
  return left.command === right.command && left.argsPrefix.join("\u0000") === right.argsPrefix.join("\u0000");
}
