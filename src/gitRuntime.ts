import { execFile } from "child_process";
import * as path from "path";

export type GitCommand = {
  command: string;
  argsPrefix: string[];
  displayLabel: string;
};

type ExecResult = {
  stdout: string;
  stderr: string;
  error?: Error;
};

let resolvedGitCommandPromise: Promise<GitCommand | null> | undefined;

export function isMissingGitFailureDetail(detail: string): boolean {
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("is not recognized as an internal or external command") ||
    normalized.includes("git: command not found") ||
    normalized.includes("no such file or directory") ||
    normalized.includes("cannot find the file specified") ||
    normalized.includes("not found")
  );
}

export function buildMissingGitMessage(): string {
  return "Git not found. Install Git and ensure `git` is available on PATH or configure VS Code `git.path`, then retry.";
}

export async function detectGitCommand(): Promise<boolean> {
  return Boolean(await resolveGitCommand());
}

export function getGitCommandCandidates(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  configuredGitPath: string | string[] | undefined = readConfiguredGitPathSetting()
): GitCommand[] {
  const pathModule = platform === "win32" ? path.win32 : path;
  const candidates: GitCommand[] = [];
  const seen = new Set<string>();
  const addCandidate = (command: string, displayLabel = command) => {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }
    const key = `${trimmed}\u0000${displayLabel}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push({
      command: trimmed,
      argsPrefix: [],
      displayLabel
    });
  };

  for (const configuredPath of normalizeGitPathSetting(configuredGitPath)) {
    addCandidate(configuredPath, configuredPath);
  }

  addCandidate("git", "git");

  if (platform === "win32") {
    const programDirs = [env.ProgramW6432, env.ProgramFiles, env["ProgramFiles(x86)"]].filter(
      (value): value is string => Boolean(value?.trim())
    );
    for (const programDir of programDirs) {
      addCandidate(pathModule.join(programDir, "Git", "cmd", "git.exe"));
      addCandidate(pathModule.join(programDir, "Git", "bin", "git.exe"));
      addCandidate(pathModule.join(programDir, "Git", "mingw64", "bin", "git.exe"));
    }
    if (env.LocalAppData?.trim()) {
      addCandidate(pathModule.join(env.LocalAppData, "Programs", "Git", "cmd", "git.exe"));
      addCandidate(pathModule.join(env.LocalAppData, "Programs", "Git", "bin", "git.exe"));
    }
  }

  return candidates;
}

export async function runGitCommand(cwd: string, args: string[]): Promise<ExecResult> {
  const command = await resolveGitCommand();
  if (!command) {
    const message = buildMissingGitMessage();
    return {
      error: new Error(message),
      stdout: "",
      stderr: message
    };
  }

  let result = await execFileWithOutput(command.command, [...command.argsPrefix, ...args], cwd);
  if (result.error && isMissingGitError(result)) {
    resolvedGitCommandPromise = undefined;
    const fallback = await resolveGitCommand();
    if (fallback && !isSameGitCommand(command, fallback)) {
      result = await execFileWithOutput(fallback.command, [...fallback.argsPrefix, ...args], cwd);
    } else if (!result.stderr.trim()) {
      result = {
        ...result,
        stderr: buildMissingGitMessage()
      };
    }
  }

  return result;
}

async function resolveGitCommand(): Promise<GitCommand | null> {
  if (!resolvedGitCommandPromise) {
    resolvedGitCommandPromise = detectGitCommandCandidate();
  }
  return resolvedGitCommandPromise;
}

async function detectGitCommandCandidate(): Promise<GitCommand | null> {
  for (const candidate of getGitCommandCandidates()) {
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

function isMissingGitError(result: ExecResult): boolean {
  const detail = `${result.stderr}\n${result.stdout}\n${result.error?.message || ""}`;
  return isMissingGitFailureDetail(detail);
}

function isSameGitCommand(left: GitCommand, right: GitCommand): boolean {
  return left.command === right.command && left.argsPrefix.join("\u0000") === right.argsPrefix.join("\u0000");
}

function normalizeGitPathSetting(configuredGitPath: string | string[] | undefined): string[] {
  if (typeof configuredGitPath === "string") {
    return [configuredGitPath];
  }
  if (Array.isArray(configuredGitPath)) {
    return configuredGitPath.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function readConfiguredGitPathSetting(): string | string[] | undefined {
  try {
    const vscode = require("vscode") as {
      workspace?: {
        getConfiguration?: (section: string) => {
          get: (key: string) => unknown;
        };
      };
    };
    const value = vscode.workspace?.getConfiguration?.("git")?.get("path");
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      return value as string[];
    }
  } catch {
    return undefined;
  }
  return undefined;
}
