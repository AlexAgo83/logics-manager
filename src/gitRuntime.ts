import { execFile } from "child_process";

export function isMissingGitFailureDetail(detail: string): boolean {
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("is not recognized as an internal or external command") ||
    normalized.includes("git: command not found") ||
    normalized.includes("no such file or directory") ||
    normalized.includes("cannot find the file specified") ||
    normalized.includes("not found")
  );
}

export function buildMissingGitMessage(): string {
  return "Git not found. Install Git and ensure `git` is available on PATH, then retry.";
}

export async function detectGitCommand(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("git", ["--version"], (error) => {
      resolve(!error);
    });
  });
}
