import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: []
  }
}));

import { inspectGitHubReleaseCapability } from "../src/releasePublishSupport";

describe("inspectGitHubReleaseCapability", () => {
  it("rejects non-git repositories", async () => {
    const capability = await inspectGitHubReleaseCapability("/workspace/mock", {
      runGit: vi.fn(async (_root, args) => {
        if (args[0] === "rev-parse") {
          return { stdout: "false\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      }) as never,
      detectGhCli: vi.fn(async () => true)
    });

    expect(capability.available).toBe(false);
    expect(capability.title).toContain("Git repository");
  });

  it("rejects repositories without a GitHub remote", async () => {
    const capability = await inspectGitHubReleaseCapability("/workspace/mock", {
      runGit: vi.fn(async (_root, args) => {
        if (args[0] === "rev-parse") {
          return { stdout: "true\n", stderr: "" };
        }
        if (args[0] === "remote") {
          return {
            stdout: "origin\tgit@gitlab.com:acme/repo.git (fetch)\norigin\tgit@gitlab.com:acme/repo.git (push)\n",
            stderr: ""
          };
        }
        return { stdout: "", stderr: "" };
      }) as never,
      detectGhCli: vi.fn(async () => true)
    });

    expect(capability.available).toBe(false);
    expect(capability.title).toContain("GitHub remote");
  });

  it("rejects repositories when gh is unavailable", async () => {
    const capability = await inspectGitHubReleaseCapability("/workspace/mock", {
      runGit: vi.fn(async (_root, args) => {
        if (args[0] === "rev-parse") {
          return { stdout: "true\n", stderr: "" };
        }
        if (args[0] === "remote") {
          return {
            stdout: "origin\thttps://github.com/acme/repo.git (fetch)\norigin\thttps://github.com/acme/repo.git (push)\n",
            stderr: ""
          };
        }
        return { stdout: "", stderr: "" };
      }) as never,
      detectGhCli: vi.fn(async () => false)
    });

    expect(capability.available).toBe(false);
    expect(capability.title).toContain("GitHub CLI");
  });

  it("accepts repositories with a GitHub remote and gh available", async () => {
    const capability = await inspectGitHubReleaseCapability("/workspace/mock", {
      runGit: vi.fn(async (_root, args) => {
        if (args[0] === "rev-parse") {
          return { stdout: "true\n", stderr: "" };
        }
        if (args[0] === "remote") {
          return {
            stdout:
              "upstream\thttps://github.com/acme/upstream.git (fetch)\nupstream\thttps://github.com/acme/upstream.git (push)\norigin\tgit@github.com:acme/repo.git (fetch)\norigin\tgit@github.com:acme/repo.git (push)\n",
            stderr: ""
          };
        }
        return { stdout: "", stderr: "" };
      }) as never,
      detectGhCli: vi.fn(async () => true)
    });

    expect(capability.available).toBe(true);
    expect(capability.githubRemoteName).toBe("origin");
    expect(capability.githubRemoteUrl).toContain("github.com");
  });
});
