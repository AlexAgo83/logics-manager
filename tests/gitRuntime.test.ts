import { describe, expect, it } from "vitest";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "../src/gitRuntime";

describe("gitRuntime", () => {
  it("recognizes common missing-git launcher errors", () => {
    expect(isMissingGitFailureDetail("'git' is not recognized as an internal or external command")).toBe(true);
    expect(isMissingGitFailureDetail("git: command not found")).toBe(true);
  });

  it("builds an actionable missing-git message", () => {
    expect(buildMissingGitMessage()).toContain("Install Git");
    expect(buildMissingGitMessage()).toContain("`git`");
  });
});
