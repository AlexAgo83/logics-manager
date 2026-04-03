import { afterEach, describe, expect, it } from "vitest";
import {
  buildMissingGitMessage,
  configureGitPathSettingReader,
  getGitCommandCandidates,
  isMissingGitFailureDetail
} from "../src/gitRuntime";

describe("gitRuntime", () => {
  afterEach(() => {
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
});
