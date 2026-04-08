import { beforeEach, describe, expect, it, vi } from "vitest";

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
    execFileMock.mockImplementation((command: string, args: string[], options: unknown, callback: (...args: any[]) => void) => {
      const cb = typeof options === "function" ? options : callback;
      cb(new Error(`${command} not found`), "", `${command} not found`);
    });

    const runtime = await import("../src/pythonRuntime");
    const result = await runtime.runPythonCommand("/workspace", "scripts/logics.py", ["flow"]);

    expect(result.error?.message).toContain("Python 3 interpreter not found");
    expect(result.stderr).toContain("Python 3 interpreter not found");
    expect(execFileMock).toHaveBeenCalledTimes(2);
  });

  it("retries with a fresh interpreter candidate when the resolved command starts failing", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];

    execFileMock.mockImplementation((command: string, args: string[], options: unknown, callback: (...args: any[]) => void) => {
      const actualArgs = Array.isArray(args) ? args : [];
      const cb = typeof options === "function" ? options : callback;
      calls.push({ command, args: actualArgs });

      switch (calls.length) {
        case 1:
          cb(null, "Python 3.11.0\n", "");
          return;
        case 2:
        case 3:
          cb(new Error(`${command} not found`), "", `${command} not found`);
          return;
        case 4:
          cb(null, "Python 3.12.1\n", "");
          return;
        case 5:
          cb(null, "ok\n", "");
          return;
        default:
          throw new Error(`Unexpected execFile call ${calls.length}`);
      }
    });

    const runtime = await import("../src/pythonRuntime");
    const result = await runtime.runPythonCommand("/workspace", "scripts/logics.py", ["flow"]);

    expect(result.stdout).toBe("ok\n");
    expect(calls).toEqual([
      { command: "python3", args: ["--version"] },
      { command: "python3", args: ["scripts/logics.py", "flow"] },
      { command: "python3", args: ["--version"] },
      { command: "python", args: ["--version"] },
      { command: "python", args: ["scripts/logics.py", "flow"] }
    ]);
  });
});
