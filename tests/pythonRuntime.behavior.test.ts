import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPythonCommandCandidates } from "../src/pythonRuntime";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({
  execFile: execFileMock
}));

describe("pythonRuntime behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileMock.mockReset();
  });

  it("returns missing-runtime guidance when no interpreter can be resolved", async () => {
    const candidates = getPythonCommandCandidates();
    execFileMock.mockImplementation((command: string, args: string[], options: unknown, callback: (...args: any[]) => void) => {
      const cb = typeof options === "function" ? options : callback;
      cb(new Error(`${command} not found`), "", `${command} not found`);
    });

    const runtime = await import("../src/pythonRuntime");
    const result = await runtime.runPythonCommand("/workspace", "scripts/logics.py", ["flow"]);

    expect(result.error?.message).toContain("Python 3 interpreter not found");
    expect(result.stderr).toContain("Python 3 interpreter not found");
    expect(execFileMock).toHaveBeenCalledTimes(candidates.length);
  });

  it("retries with a fresh interpreter candidate when the resolved command starts failing", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const candidates = getPythonCommandCandidates();

    execFileMock.mockImplementation((command: string, args: string[], options: unknown, callback: (...args: any[]) => void) => {
      const actualArgs = Array.isArray(args) ? args : [];
      const cb = typeof options === "function" ? options : callback;
      calls.push({ command, args: actualArgs });

      switch (calls.length) {
        case 1:
          cb(null, "Python 3.11.0\n", "");
          return;
        case 2:
          cb(new Error(`${command} not found`), "", `${command} not found`);
          return;
        case 3:
          cb(new Error(`${command} not found`), "", `${command} not found`);
          return;
        case 4:
          if (candidates.length === 4) {
            cb(new Error(`${command} not found`), "", `${command} not found`);
            return;
          }
          cb(null, "Python 3.12.1\n", "");
          return;
        case 5:
          if (candidates.length === 4) {
            cb(null, "Python 3.12.1\n", "");
            return;
          }
          cb(null, "ok\n", "");
          return;
        case 6:
          cb(null, "ok\n", "");
          return;
        default:
          throw new Error(`Unexpected execFile call ${calls.length}`);
      }
    });

    const runtime = await import("../src/pythonRuntime");
    const result = await runtime.runPythonCommand("/workspace", "scripts/logics.py", ["flow"]);

    expect(result.stdout).toBe("ok\n");
    if (process.platform === "win32") {
      expect(calls).toEqual([
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "--version"] },
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "scripts/logics.py", "flow"] },
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "--version"] },
        { command: candidates[1].command, args: [...candidates[1].argsPrefix, "--version"] },
        { command: candidates[2].command, args: [...candidates[2].argsPrefix, "--version"] },
        { command: candidates[2].command, args: [...candidates[2].argsPrefix, "scripts/logics.py", "flow"] }
      ]);
    } else {
      expect(calls).toEqual([
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "--version"] },
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "scripts/logics.py", "flow"] },
        { command: candidates[0].command, args: [...candidates[0].argsPrefix, "--version"] },
        { command: candidates[1].command, args: [...candidates[1].argsPrefix, "--version"] },
        { command: candidates[1].command, args: [...candidates[1].argsPrefix, "scripts/logics.py", "flow"] }
      ]);
    }
  });
});
