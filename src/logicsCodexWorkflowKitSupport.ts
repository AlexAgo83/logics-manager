import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { inspectCodexWorkspaceOverlay } from "./logicsCodexWorkspace";
import { inspectClaudeGlobalKit } from "./logicsClaudeGlobalKit";
import { runGitWithOutput } from "./logicsProviderUtils";

export const CANONICAL_LOGICS_KIT_URL = "https://github.com/AlexAgo83/cdx-logics-kit.git";
export const CANONICAL_LOGICS_KIT_BRANCH = "main";
export const LOGICS_SKILLS_SUBMODULE_PATH = "logics/skills";
const CANONICAL_LOGICS_GITMODULES = [
  '[submodule "logics/skills"]',
  "\tpath = logics/skills",
  `\turl = ${CANONICAL_LOGICS_KIT_URL}`
].join("\n") + "\n";

export type FallbackKitInstallResult = {
  installed: boolean;
  sourceLabel?: string;
  method?: "copy" | "clone";
  failureMessage?: string;
};

export function ensureCanonicalGitmodules(root: string): void {
  const gitmodulesPath = path.join(root, ".gitmodules");
  if (!fs.existsSync(gitmodulesPath)) {
    fs.writeFileSync(gitmodulesPath, CANONICAL_LOGICS_GITMODULES, "utf8");
    return;
  }

  let content = "";
  try {
    content = fs.readFileSync(gitmodulesPath, "utf8");
  } catch {
    fs.writeFileSync(gitmodulesPath, CANONICAL_LOGICS_GITMODULES, "utf8");
    return;
  }

  if (content.includes("path = logics/skills")) {
    return;
  }

  const separator = content.endsWith("\n") || content.length === 0 ? "" : "\n";
  fs.writeFileSync(gitmodulesPath, `${content}${separator}${CANONICAL_LOGICS_GITMODULES}`, "utf8");
}

function getFallbackKitSource(root: string): { sourcePath: string; label: string } | null {
  const codexSnapshot = inspectCodexWorkspaceOverlay(root);
  const claudeSnapshot = inspectClaudeGlobalKit(root);
  const candidates: Array<{ sourcePath: string; label: string; publishedAt?: string }> = [];

  if (codexSnapshot.overlayRoot && fs.existsSync(codexSnapshot.overlayRoot)) {
    candidates.push({
      sourcePath: codexSnapshot.overlayRoot,
      label: "Codex",
      publishedAt: codexSnapshot.publishedAt
    });
  }

  if (claudeSnapshot.claudeHome) {
    const claudeSkillsRoot = path.join(claudeSnapshot.claudeHome, "skills");
    if (fs.existsSync(claudeSkillsRoot)) {
      candidates.push({
        sourcePath: claudeSkillsRoot,
        label: "Claude",
        publishedAt: claudeSnapshot.publishedAt
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => {
    const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : 0;
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.label.localeCompare(right.label);
  });

  return candidates[0];
}

function copyFallbackKitSource(root: string, sourcePath: string, label: string): void {
  const skillsDir = path.join(root, LOGICS_SKILLS_SUBMODULE_PATH);
  fs.rmSync(skillsDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(skillsDir), { recursive: true });
  fs.cpSync(sourcePath, skillsDir, { recursive: true, force: true, dereference: false });
  ensureCanonicalGitmodules(root);
  void vscode.window.showInformationMessage(`Logics kit restored from the ${label} global kit.`);
}

export async function fallbackInstallKit(root: string): Promise<FallbackKitInstallResult> {
  const source = getFallbackKitSource(root);
  if (source) {
    try {
      copyFallbackKitSource(root, source.sourcePath, source.label);
      return {
        installed: true,
        sourceLabel: source.label,
        method: "copy"
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const choice = await vscode.window.showWarningMessage(
        `Copying the Logics kit from the ${source.label} global kit failed: ${message}. Try a direct clone instead?`,
        "Clone"
      );
      if (choice !== "Clone") {
        return {
          installed: false,
          failureMessage: message
        };
      }
    }
  }

  fs.rmSync(path.join(root, LOGICS_SKILLS_SUBMODULE_PATH), { recursive: true, force: true });
  const cloneResult = await runGitWithOutput(root, [
    "clone",
    "--branch",
    CANONICAL_LOGICS_KIT_BRANCH,
    CANONICAL_LOGICS_KIT_URL,
    LOGICS_SKILLS_SUBMODULE_PATH
  ]);
  if (cloneResult.error) {
    const detail = `${cloneResult.stderr}\n${cloneResult.stdout}\n${cloneResult.error.message}`.trim();
    return {
      installed: false,
      failureMessage: detail || cloneResult.error.message
    };
  }

  ensureCanonicalGitmodules(root);
  void vscode.window.showInformationMessage("Logics kit restored by cloning the canonical kit repository.");
  return {
    installed: true,
    method: "clone"
  };
}

export function appendBootstrapConvergenceNote(
  message: string,
  convergence: {
    attempted: boolean;
    applied: boolean;
    failureMessage?: string;
  }
): string {
  if (!convergence.attempted) {
    return message;
  }
  if (convergence.applied) {
    return `${message} Repo-local bootstrap files were reconciled with the current kit.`;
  }
  if (convergence.failureMessage) {
    return `${message} Repo-local bootstrap convergence still needs attention: ${convergence.failureMessage}`;
  }
  return message;
}
