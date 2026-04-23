import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  buildCandidates,
  isMissingCommandError,
  isSupportedPythonVersion,
  parsePythonVersion,
  resolvePythonLauncher,
  runLogicsManager
} from "../scripts/npm/logics-manager.mjs";

const root = process.cwd();

describe("logics-manager npm wrapper", () => {
  const expectedScriptPath = path.resolve(root, "scripts", "logics-manager.py");

  it("builds platform-specific candidate launchers", () => {
    expect(buildCandidates("linux")).toEqual([
      { command: "python3", argsPrefix: [] },
      { command: "python", argsPrefix: [] }
    ]);
    expect(buildCandidates("win32")).toEqual([
      { command: "python3", argsPrefix: [] },
      { command: "python", argsPrefix: [] },
      { command: "py", argsPrefix: ["-3"] },
      { command: "py", argsPrefix: [] }
    ]);
  });

  it("parses and validates supported Python versions", () => {
    expect(parsePythonVersion("Python 3.11.4")).toEqual({ major: 3, minor: 11 });
    expect(parsePythonVersion("something else")).toBeNull();
    expect(isSupportedPythonVersion({ major: 3, minor: 10 })).toBe(true);
    expect(isSupportedPythonVersion({ major: 3, minor: 9 })).toBe(false);
  });

  it("recognizes missing command errors", () => {
    expect(isMissingCommandError(new Error("spawn python3 ENOENT"))).toBe(true);
    expect(isMissingCommandError(new Error("random failure"))).toBe(false);
  });

  it("runs the first supported python launcher", () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      if (args.includes("--version")) {
        return { status: 0, stdout: "", stderr: "Python 3.11.0\n" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });

    const exitCode = runLogicsManager(["--help"], "linux", spawn as never);

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      { command: "python3", args: ["--version"] },
      { command: "python3", args: [expectedScriptPath, "--help"] }
    ]);
  });

  it("falls back to the next launcher when the first command is missing", () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawn = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      if (command === "python3") {
        return { status: null, stdout: "", stderr: "", error: new Error("spawn python3 ENOENT") };
      }
      if (args.includes("--version")) {
        return { status: 0, stdout: "", stderr: "Python 3.11.0\n" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });

    const exitCode = runLogicsManager(["--help"], "linux", spawn as never);

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      { command: "python3", args: ["--version"] },
      { command: "python", args: ["--version"] },
      { command: "python", args: [expectedScriptPath, "--help"] }
    ]);
  });
});
