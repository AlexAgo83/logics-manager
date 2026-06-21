import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  buildCandidates,
  isMissingCommandError,
  isDirectInvocation,
  isSupportedPythonVersion,
  parsePythonVersion,
  resolvePythonLauncher,
  runLogicsManager
} from "../scripts/npm/logics-manager.mjs";

const root = process.cwd();

describe("logics-manager npm wrapper", () => {
  const expectedScriptPath = path.resolve(root, "scripts", "logics-manager.py");

  function successfulChild() {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn();
    queueMicrotask(() => child.emit("close", 0, null));
    return child;
  }

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

  it("recognizes direct execution through a symlink path", () => {
    const realPath = path.join(root, "scripts", "npm", "logics-manager.mjs");
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-manager-wrapper-"));
    const symlinkPath = path.join(tempRoot, "logics-manager");
    fs.symlinkSync(realPath, symlinkPath);

    expect(isDirectInvocation(new URL(`file://${realPath}`).href, symlinkPath)).toBe(true);
  });

  it("runs the first supported python launcher", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawnVersion = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      if (args.includes("--version")) {
        return { status: 0, stdout: "", stderr: "Python 3.11.0\n" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });
    const spawnCommand = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      return successfulChild();
    });

    const exitCode = await runLogicsManager(["--help"], "linux", spawnVersion as never, spawnCommand as never);

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      { command: "python3", args: ["--version"] },
      { command: "python3", args: [expectedScriptPath, "--help"] }
    ]);
  });

  it("falls back to the next launcher when the first command is missing", async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawnVersion = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      if (command === "python3") {
        return { status: null, stdout: "", stderr: "", error: new Error("spawn python3 ENOENT") };
      }
      if (args.includes("--version")) {
        return { status: 0, stdout: "", stderr: "Python 3.11.0\n" };
      }
      return { status: 0, stdout: "", stderr: "" };
    });
    const spawnCommand = vi.fn((command: string, args: string[]) => {
      calls.push({ command, args });
      return successfulChild();
    });

    const exitCode = await runLogicsManager(["--help"], "linux", spawnVersion as never, spawnCommand as never);

    expect(exitCode).toBe(0);
    expect(calls).toEqual([
      { command: "python3", args: ["--version"] },
      { command: "python", args: ["--version"] },
      { command: "python", args: [expectedScriptPath, "--help"] }
    ]);
  });

  it("does not double-forward SIGINT on POSIX terminals", async () => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn(() => true);
    const spawnVersion = vi.fn(() => ({ status: 0, stdout: "Python 3.11.0\n", stderr: "" }));
    const spawnCommand = vi.fn(() => child);

    const running = runLogicsManager(["view", "--port", "0"], "linux", spawnVersion as never, spawnCommand as never);
    process.emit("SIGINT");
    queueMicrotask(() => child.emit("close", null, "SIGINT"));
    const exitCode = await running;

    expect(child.kill).not.toHaveBeenCalled();
    expect(exitCode).toBe(130);
  });

  it("forwards SIGINT to the spawned python command on Windows", async () => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn((signal: string) => {
      queueMicrotask(() => child.emit("close", null, signal));
      return true;
    });
    const spawnVersion = vi.fn(() => ({ status: 0, stdout: "Python 3.11.0\n", stderr: "" }));
    const spawnCommand = vi.fn(() => child);

    const running = runLogicsManager(["view", "--port", "0"], "win32", spawnVersion as never, spawnCommand as never);
    process.emit("SIGINT");
    const exitCode = await running;

    expect(child.kill).toHaveBeenCalledWith("SIGINT");
    expect(exitCode).toBe(130);
  });

  it("runs the real npm wrapper against a temporary repo", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-manager-wrapper-e2e-"));
    const repoRoot = path.join(tempRoot, "repo");
    fs.mkdirSync(path.join(repoRoot, "logics", "request"), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, "logics", "backlog"), { recursive: true });
    fs.mkdirSync(path.join(repoRoot, "logics", "tasks"), { recursive: true });

    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts", "npm", "logics-manager.mjs"),
        "flow",
        "new",
        "request",
        "--title",
        "Wrapper JSON Contract",
        "--format",
        "json"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      command: "new",
      kind: "request",
      path: "logics/request/req_000_wrapper_json_contract.md"
    });
    expect(fs.existsSync(path.join(repoRoot, payload.path))).toBe(true);
  });

  it("propagates failing audit exit codes from the real npm wrapper", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "logics-manager-wrapper-audit-"));
    const repoRoot = path.join(tempRoot, "repo");
    const productRoot = path.join(repoRoot, "logics", "product");
    fs.mkdirSync(productRoot, { recursive: true });
    fs.writeFileSync(
      path.join(productRoot, "prod_001_demo.md"),
      [
        "## prod_001_demo - Demo product brief",
        "> Date: 2026-06-12",
        "> Status: Proposed",
        "",
        "# Overview",
        "Early product framing without complete lineage yet.",
        ""
      ].join("\n")
    );

    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "scripts", "npm", "logics-manager.mjs"),
        "audit",
        "--governance-profile",
        "strict",
        "--format",
        "json"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({
      ok: false,
      issue_count: 2
    });
  });
});
