import { execFile } from "child_process";
import { runGitWithOutput } from "./logicsProviderUtils";

export type ReleasePublishCapability = {
  available: boolean;
  title: string;
  reason?: string;
  githubRemoteName?: string;
  githubRemoteUrl?: string;
};

type CapabilityOptions = {
  runGit?: typeof runGitWithOutput;
  detectGhCli?: () => Promise<boolean>;
};

const DEFAULT_PUBLISH_TITLE = "Create the release tag, push, and publish the GitHub release";

export async function inspectGitHubReleaseCapability(
  root: string,
  options: CapabilityOptions = {}
): Promise<ReleasePublishCapability> {
  const runGit = options.runGit ?? runGitWithOutput;
  const detectGhCli = options.detectGhCli ?? detectGitHubCli;

  const repoCheck = await runGit(root, ["rev-parse", "--is-inside-work-tree"]);
  if (repoCheck.error || repoCheck.stdout.trim() !== "true") {
    return unavailable("Publish Release requires a Git repository.");
  }

  const remotes = await runGit(root, ["remote", "-v"]);
  const githubRemote = pickGitHubRemote(remotes.stdout);
  if (!githubRemote) {
    return unavailable("Publish Release is only available for repositories with a GitHub remote.");
  }

  const ghAvailable = await detectGhCli();
  if (!ghAvailable) {
    return unavailable("Publish Release requires GitHub CLI (`gh`) on PATH.");
  }

  return {
    available: true,
    title: DEFAULT_PUBLISH_TITLE,
    githubRemoteName: githubRemote.name,
    githubRemoteUrl: githubRemote.url
  };
}

function unavailable(reason: string): ReleasePublishCapability {
  return {
    available: false,
    title: reason,
    reason
  };
}

type GitRemote = {
  name: string;
  url: string;
};

function pickGitHubRemote(stdout: string): GitRemote | null {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const remotes = lines
    .map(parseRemoteLine)
    .filter((entry): entry is GitRemote => Boolean(entry))
    .filter((entry) => isGitHubRemoteUrl(entry.url));
  if (remotes.length === 0) {
    return null;
  }
  return (
    remotes.find((entry) => entry.name === "origin") ||
    remotes.find((entry) => entry.name === "upstream") ||
    remotes[0]
  );
}

function parseRemoteLine(line: string): GitRemote | null {
  const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
  if (!match) {
    return null;
  }
  return {
    name: match[1],
    url: match[2]
  };
}

function isGitHubRemoteUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes("github.com/") || normalized.includes("github.com:");
}

async function detectGitHubCli(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("gh", ["--version"], (error) => {
      resolve(!error);
    });
  });
}
