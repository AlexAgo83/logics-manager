#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function buildCandidates(platform = process.platform) {
  return platform === "win32"
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
}

export function isMissingCommandError(error) {
  const detail = `${error?.message || ""}\n${error?.stderr || ""}\n${error?.stdout || ""}`.toLowerCase();
  return (
    detail.includes("enoent") ||
    detail.includes("not recognized as an internal or external command") ||
    detail.includes("command not found") ||
    detail.includes("python was not found") ||
    detail.includes("cannot find the file specified")
  );
}

export function parsePythonVersion(text) {
  const match = text.match(/Python\s+(\d+)\.(\d+)(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10)
  };
}

export function isSupportedPythonVersion(version) {
  return version.major > 3 || (version.major === 3 && version.minor >= 10);
}

export function resolvePythonLauncher(candidate, spawn = spawnSync) {
  const result = spawn(candidate.command, [...candidate.argsPrefix, "--version"], {
    encoding: "utf8"
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  const versionText = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const version = parsePythonVersion(versionText);
  if (!version || !isSupportedPythonVersion(version)) {
    return null;
  }

  return candidate;
}

function childExitCode(code, signal) {
  if (typeof code === "number") {
    return code;
  }
  if (signal === "SIGINT") {
    return 130;
  }
  if (signal === "SIGTERM") {
    return 143;
  }
  return 1;
}

export function shouldForwardSignal(signal, platform = process.platform) {
  if (signal === "SIGINT" && platform !== "win32") {
    return false;
  }
  return true;
}

export function runChildProcess(command, args, spawnCommand = spawn, platform = process.platform) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawnCommand(command, args, { stdio: "inherit" });
    const finish = (code) => {
      if (settled) return;
      settled = true;
      process.off("SIGINT", forwardSigint);
      process.off("SIGTERM", forwardSigterm);
      resolve(code);
    };
    const forward = (signal) => {
      if (!shouldForwardSignal(signal, platform)) {
        return;
      }
      try {
        child.kill(signal);
      } catch {
        // Child may already be gone.
      }
    };
    const forwardSigint = () => forward("SIGINT");
    const forwardSigterm = () => forward("SIGTERM");
    process.on("SIGINT", forwardSigint);
    process.on("SIGTERM", forwardSigterm);
    child.on("error", (error) => {
      finish(isMissingCommandError(error) ? null : 1);
    });
    child.on("close", (code, signal) => {
      finish(childExitCode(code, signal));
    });
  });
}

export async function runLogicsManager(argv = process.argv.slice(2), platform = process.platform, spawnVersion = spawnSync, spawnCommand = spawn) {
  const candidates = buildCandidates(platform);
  const wrapperDir = dirname(fileURLToPath(import.meta.url));
  const packageRoot = resolve(wrapperDir, "..", "..");
  const scriptPath = resolve(packageRoot, "scripts", "logics-manager.py");
  for (const candidate of candidates) {
    const launcher = resolvePythonLauncher(candidate, spawnVersion);
    if (!launcher) {
      continue;
    }

    const status = await runChildProcess(launcher.command, [...launcher.argsPrefix, scriptPath, ...argv], spawnCommand, platform);
    if (status === null) {
      continue;
    }
    return status;
  }

  console.error(
    platform === "win32"
      ? "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3`, `python`, or `py` is available on PATH."
      : "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3` or `python` is available on PATH."
  );
  return 1;
}

export function isDirectInvocation(importUrl = import.meta.url, argvPath = process.argv[1]) {
  if (!argvPath) {
    return false;
  }
  try {
    return importUrl === pathToFileURL(realpathSync(argvPath)).href;
  } catch {
    return importUrl === pathToFileURL(argvPath).href;
  }
}

if (isDirectInvocation()) {
  runLogicsManager()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error?.message || error);
      process.exit(1);
    });
}
