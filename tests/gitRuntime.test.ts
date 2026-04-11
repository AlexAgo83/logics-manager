import { afterEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({
  execFile: execFileMock
}));

import {
  buildMissingGitMessage,
  configureGitPathSettingReader,
  detectGitCommand,
  getGitCommandCandidates,
  isMissingGitFailureDetail,
  runGitCommand
} from "../src/gitRuntime";

describe("gitRuntime", () => {
  afterEach(() => {
    execFileMock.mockReset();
    configureGitPathSettingReader(undefined);
  });

  it("recognizes common missing-git launcher errors", () => {
    expect(isMissingGitFailureDetail("'git' is not recognized as an internal or external command")).toBe(true);
    expect(isMissingGitFailureDetail("git: command not found")).toBe(true);
  });

  it("builds an actionable missing-git message", () => {
    expect(buildMissingGitMessage()).toContain("Install Git");
    expect(buildMissingGitMessage()).toContain("`git`");
    expect(buildMissingGitMessage()).toContain("`git.path`");
  });

  it("prefers configured git.path entries before the plain git launcher", () => {
    const candidates = getGitCommandCandidates("win32", {}, "C:\\Program Files\\Git\\cmd\\git.exe");

    expect(candidates[0]?.command).toBe("C:\\Program Files\\Git\\cmd\\git.exe");
    expect(candidates.some((candidate) => candidate.command === "git")).toBe(true);
  });

  it("adds common Windows fallback locations when PATH is insufficient", () => {
    const candidates = getGitCommandCandidates("win32", {
      ProgramFiles: "C:\\Program Files",
      "ProgramFiles(x86)": "C:\\Program Files (x86)",
      LocalAppData: "C:\\Users\\Alice\\AppData\\Local"
    });

    expect(candidates.some((candidate) => candidate.command === "C:\\Program Files\\Git\\cmd\\git.exe")).toBe(true);
    expect(
      candidates.some(
        (candidate) => candidate.command === "C:\\Users\\Alice\\AppData\\Local\\Programs\\Git\\cmd\\git.exe"
      )
    ).toBe(true);
  });

  it("reads configured git.path through the injected setting reader by default", () => {
    configureGitPathSettingReader(() => "C:\\Tools\\git.exe");

    const candidates = getGitCommandCandidates("win32", {});

    expect(candidates[0]?.command).toBe("C:\\Tools\\git.exe");
  });

  it("detects git when the first configured candidate succeeds", async () => {
    configureGitPathSettingReader(() => "/opt/bin/git");
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, callback?: unknown) => {
      const cb = (typeof optionsOrCallback === "function" ? optionsOrCallback : callback) as (
        error: Error | null,
        stdout?: string,
        stderr?: string
      ) => void;
      if (args.includes("--version")) {
        cb(null, `${command} version 2.0.0`, "");
        return;
      }
      cb(null, "output", "");
    });

    await expect(detectGitCommand()).resolves.toBe(true);
  });

  it("returns false when git is unavailable across all candidates", async () => {
    configureGitPathSettingReader(() => "/opt/bin/git");
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, callback?: unknown) => {
      const cb = (typeof optionsOrCallback === "function" ? optionsOrCallback : callback) as (
        error: Error | null,
        stdout?: string,
        stderr?: string
      ) => void;
      cb(new Error(`missing ${command}`), "", "command not found");
    });

    await expect(detectGitCommand()).resolves.toBe(false);
  });

  it("runs git commands through the resolved command and returns stdout", async () => {
    configureGitPathSettingReader(() => "/opt/bin/git");
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, callback?: unknown) => {
      const cb = (typeof optionsOrCallback === "function" ? optionsOrCallback : callback) as (
        error: Error | null,
        stdout?: string,
        stderr?: string
      ) => void;
      if (args.includes("--version")) {
        cb(null, `${command} version 2.0.0`, "");
        return;
      }
      cb(null, "output", "");
    });

    await expect(runGitCommand("/repo", ["status"])).resolves.toEqual({
      error: undefined,
      stdout: "output",
      stderr: ""
    });
  });

  it("returns a missing-git error when no executable can be resolved", async () => {
    configureGitPathSettingReader(() => "/opt/bin/git");
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, callback?: unknown) => {
      const cb = (typeof optionsOrCallback === "function" ? optionsOrCallback : callback) as (
        error: Error | null,
        stdout?: string,
        stderr?: string
      ) => void;
      cb(new Error(`${command}: not found`), "", "git: command not found");
    });

    await expect(runGitCommand("/repo", ["status"])).resolves.toEqual({
      error: expect.any(Error),
      stdout: "",
      stderr: buildMissingGitMessage()
    });
  });

  it("falls back to a later git candidate when the first one disappears mid-session", async () => {
    configureGitPathSettingReader(() => ["/opt/bin/git", "/usr/bin/git"]);
    let callCount = 0;
    execFileMock.mockImplementation((command: string, args: string[], optionsOrCallback: unknown, callback?: unknown) => {
      const cb = (typeof optionsOrCallback === "function" ? optionsOrCallback : callback) as (
        error: Error | null,
        stdout?: string,
        stderr?: string
      ) => void;
      callCount += 1;
      if (callCount === 1 && command === "/opt/bin/git" && args.includes("--version")) {
        cb(null, `${command} version 2.0.0`, "");
        return;
      }
      if (callCount === 2 && command === "/opt/bin/git" && args[0] === "status") {
        cb(new Error("missing git"), "", "git: command not found");
        return;
      }
      if (callCount === 3 && command === "/opt/bin/git" && args.includes("--version")) {
        cb(new Error("missing git"), "", "git: command not found");
        return;
      }
      if (callCount === 4 && command === "/usr/bin/git" && args.includes("--version")) {
        cb(null, `${command} version 2.0.0`, "");
        return;
      }
      if (callCount === 5 && command === "/usr/bin/git" && args[0] === "status") {
        cb(null, "fallback output", "");
        return;
      }
      cb(new Error(`Unexpected call ${callCount}: ${command} ${args.join(" ")}`), "", "");
    });

    await expect(runGitCommand("/repo", ["status"])).resolves.toEqual({
      error: undefined,
      stdout: "fallback output",
      stderr: ""
    });
  });

  it("normalizes array git.path inputs through the candidate list", () => {
    const candidates = getGitCommandCandidates("linux", {}, ["/usr/local/bin/git", "", "/opt/bin/git"]);

    expect(candidates.map((candidate) => candidate.command)).toEqual([
      "/usr/local/bin/git",
      "/opt/bin/git",
      "git"
    ]);
  });
});
