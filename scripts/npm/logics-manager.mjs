#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

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

export function runLogicsManager(argv = process.argv.slice(2), platform = process.platform, spawn = spawnSync) {
  const candidates = buildCandidates(platform);
  for (const candidate of candidates) {
    const launcher = resolvePythonLauncher(candidate, spawn);
    if (!launcher) {
      continue;
    }

    const result = spawn(launcher.command, [...launcher.argsPrefix, "-m", "logics_manager", ...argv], {
      stdio: "inherit"
    });
    if (result.status === 0) {
      return 0;
    }
    if (isMissingCommandError(result.error)) {
      continue;
    }
    return result.status ?? 1;
  }

  console.error(
    platform === "win32"
      ? "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3`, `python`, or `py` is available on PATH."
      : "Python 3.10+ interpreter not found. Install Python 3.10 or newer and ensure `python3` or `python` is available on PATH."
  );
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(runLogicsManager());
}
