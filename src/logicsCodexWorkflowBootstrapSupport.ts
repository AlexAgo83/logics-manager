import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repairClaudeBridgeFiles } from "./claudeBridgeSupport";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import {
  detectDangerousGitignorePatterns,
  inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule,
  runGitWithOutput,
  runPythonWithOutput,
  buildLogicsKitUpdateCommand
} from "./logicsProviderUtils";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { inspectRuntimeLaunchers } from "./runtimeLaunchers";
import {
  buildBootstrapCommitMessage,
  isBootstrapScopedPath,
  parseGitStatusEntries
} from "./workflowSupport";
import { maybeShowReadyCodexOverlayHandoff, launchClaudeTerminal, launchCodexOverlayTerminal } from "./logicsOverlaySupport";
import { inspectCodexWorkspaceOverlay, publishCodexWorkspaceOverlay, shouldPublishRepoKit } from "./logicsCodexWorkspace";
import { publishClaudeGlobalKit } from "./logicsClaudeGlobalKit";
import { inspectClaudeGlobalKit } from "./logicsClaudeGlobalKit";

type BootstrapConvergenceOutcome = {
  attempted: boolean;
  published: boolean;
  failed: boolean;
  failureMessage?: string;
};

export type LogicsCodexWorkflowBootstrapOptions = {
  refresh: () => Promise<void>;
};

const CANONICAL_LOGICS_KIT_URL = "https://github.com/AlexAgo83/cdx-logics-kit.git";
const CANONICAL_LOGICS_KIT_BRANCH = "main";
const LOGICS_SKILLS_SUBMODULE_PATH = "logics/skills";
const CANONICAL_LOGICS_GITMODULES = [
  '[submodule "logics/skills"]',
  "\tpath = logics/skills",
  `\turl = ${CANONICAL_LOGICS_KIT_URL}`
].join("\n") + "\n";

function isNotGitRepositoryDetail(detail: string): boolean {
  const normalized = detail.toLowerCase();
  return (
    normalized.includes("not a git repository") ||
    normalized.includes("not an empty git repository") ||
    normalized.includes("must be run in a work tree") ||
    normalized.includes("outside repository")
  );
}

export abstract class LogicsCodexWorkflowBootstrapSupport {
  private readonly bootstrapPromptedRoots = new Set<string>();
  private readonly bootstrapInProgressRoots = new Set<string>();
  private readonly gitignoreWarningPromptedKeys = new Set<string>();

  constructor(protected readonly options: LogicsCodexWorkflowBootstrapOptions) {}

  protected abstract updateLogicsKit(root: string, trigger: string): Promise<boolean>;
  protected abstract syncCodexOverlay(
    root: string,
    trigger: string,
    options?: {
      autoLaunchOnSuccess?: boolean;
      forceRepublish?: boolean;
    }
  ): Promise<boolean>;
  protected abstract syncClaudeGlobalKit(
    root: string,
    trigger: string,
    options?: {
      autoLaunchOnSuccess?: boolean;
      forceRepublish?: boolean;
    }
  ): Promise<boolean>;

  isBootstrapInProgress(root: string): boolean {
    return this.bootstrapInProgressRoots.has(path.resolve(root));
  }

  protected clearBootstrapPromptState(root: string): void {
    const normalized = path.resolve(root);
    this.bootstrapPromptedRoots.forEach((key) => {
      if (key === normalized || key.startsWith(`${normalized}::`)) {
        this.bootstrapPromptedRoots.delete(key);
      }
    });
  }

  protected maybeShowDangerousGitignoreWarning(root: string): void {
    const result = detectDangerousGitignorePatterns(root);
    if (!result.hasDangerousPatterns) {
      return;
    }
    const key = `${path.resolve(root)}::${result.matchedPatterns.join(",")}`;
    if (this.gitignoreWarningPromptedKeys.has(key)) {
      return;
    }
    this.gitignoreWarningPromptedKeys.add(key);
    void vscode.window.showWarningMessage(
      `Broad .gitignore pattern(s) detected for logics/skills: ${result.matchedPatterns.join(", ")}. ` +
        "This can break the submodule update path, but the extension can fall back to a copy or direct clone if you confirm."
    );
  }

  protected ensureCanonicalGitmodules(root: string): void {
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

  protected getFallbackKitSource(root: string): { sourcePath: string; label: string } | null {
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

  protected copyFallbackKitSource(root: string, sourcePath: string, label: string): void {
    const skillsDir = path.join(root, LOGICS_SKILLS_SUBMODULE_PATH);
    fs.rmSync(skillsDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(skillsDir), { recursive: true });
    fs.cpSync(sourcePath, skillsDir, { recursive: true, force: true, dereference: false });
    this.ensureCanonicalGitmodules(root);
    void vscode.window.showInformationMessage(`Logics kit restored from the ${label} global kit.`);
  }

  protected async fallbackInstallKit(root: string): Promise<{
    installed: boolean;
    sourceLabel?: string;
    method?: "copy" | "clone";
    failureMessage?: string;
  }> {
    const source = this.getFallbackKitSource(root);
    if (source) {
      try {
        this.copyFallbackKitSource(root, source.sourcePath, source.label);
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

    this.ensureCanonicalGitmodules(root);
    void vscode.window.showInformationMessage("Logics kit restored by cloning the canonical kit repository.");
    return {
      installed: true,
      method: "clone"
    };
  }

  async maybeOfferBootstrap(root: string): Promise<boolean> {
    const normalizedRoot = path.resolve(root);
    if (this.bootstrapInProgressRoots.has(normalizedRoot)) {
      return false;
    }
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (bootstrapState.status === "canonical") {
      return false;
    }

    this.maybeShowDangerousGitignoreWarning(root);

    const promptKey = `${normalizedRoot}::${bootstrapState.status}`;
    if (this.bootstrapPromptedRoots.has(promptKey)) {
      return false;
    }
    this.bootstrapPromptedRoots.add(promptKey);

    if (bootstrapState.status === "noncanonical") {
      void vscode.window.showWarningMessage(
        `This repository already has a non-canonical or malformed logics/skills setup. ${bootstrapState.reason} Use Check Environment for repair guidance.`
      );
      return false;
    }

    const action = "Bootstrap Logics";
    const message =
      bootstrapState.promptMessage ??
      "No logics/ folder found. Bootstrap Logics by adding the cdx-logics-kit submodule?";
    const choice = await vscode.window.showInformationMessage(message, action, "Not now");
    if (choice !== action) {
      return false;
    }

    await this.bootstrapLogics(root);
    return true;
  }

  async launchCodexFromTools(root: string): Promise<void> {
    const launchers = await inspectRuntimeLaunchers(root);
    if (!launchers.codex.available && launchers.codex.title === "Codex CLI not found on PATH") {
      void vscode.window.showWarningMessage(launchers.codex.title);
      return;
    }

    const snapshot = await inspectLogicsEnvironment(root);
    const globalKit = snapshot.codexOverlay;
    if ((globalKit.status === "healthy" || globalKit.status === "warning") && !this.codexKitNeedsRepublish(root, globalKit)) {
      if (!globalKit.runCommand) {
        void vscode.window.showWarningMessage("Codex launch command is unavailable for the published global kit.");
        return;
      }
      launchCodexOverlayTerminal(root, globalKit.runCommand);
      return;
    }

    if (snapshot.codexOverlay.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      const actions: string[] = [];
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
      actions.push("Copy Update Command");
      const choice = await vscode.window.showWarningMessage(
        `Global Codex kit publication is unavailable because the Logics kit in this repository is not a healthy publication source yet. ${snapshot.codexOverlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Kit") {
        await this.updateLogicsKit(root, "launch request");
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return;
    }

    await this.syncCodexOverlay(root, "tools launch", { autoLaunchOnSuccess: true });
  }

  async launchClaudeFromTools(root: string): Promise<void> {
    const launchers = await inspectRuntimeLaunchers(root);
    if (!launchers.claude.available && launchers.claude.title === "Claude CLI not found on PATH") {
      void vscode.window.showWarningMessage(launchers.claude.title);
      return;
    }

    const snapshot = await inspectLogicsEnvironment(root);
    const globalKit = snapshot.claudeGlobalKit;
    if (globalKit?.status === "healthy") {
      launchClaudeTerminal(root, launchers.claude.command);
      return;
    }

    if (globalKit?.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      const actions: string[] = [];
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
      actions.push("Copy Update Command");
      const choice = await vscode.window.showWarningMessage(
        `Global Claude kit publication is unavailable because the Logics kit in this repository is not a healthy publication source yet. ${globalKit.summary}`,
        ...actions
      );
      if (choice === "Update Logics Kit") {
        await this.updateLogicsKit(root, "launch request");
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return;
    }

    await this.syncClaudeGlobalKit(root, "tools launch", { autoLaunchOnSuccess: true });
  }

  async bootstrapLogics(root: string): Promise<void> {
    const normalizedRoot = path.resolve(root);
    this.bootstrapInProgressRoots.add(normalizedRoot);
    this.clearBootstrapPromptState(root);
    try {
      const scriptPath = path.join(root, "logics", "skills", "logics.py");
      const scriptArgs = ["bootstrap"];
      const bootstrapState = inspectLogicsBootstrapState(root);
      const beforeBootstrapStatus = await this.inspectGlobalCodexKitPublishability(root);
      if (beforeBootstrapStatus.snapshot.git.available) {
        const gitStatus = await runGitWithOutput(root, ["status", "--porcelain"]);
        if (!gitStatus.error) {
          beforeBootstrapStatus.changedPaths = parseGitStatusEntries(gitStatus.stdout).map((entry) => entry.path);
        }
      }

      if (!beforeBootstrapStatus.snapshot.git.available) {
        void vscode.window.showErrorMessage(
          `Bootstrap Logics requires Git. ${buildMissingGitMessage()} The extension can repair repository state but cannot install system tools automatically. Use \`Logics: Check Environment\` for details. Read-only Logics browsing remains available until bootstrap completes.`
        );
        return;
      }

      if (!beforeBootstrapStatus.snapshot.python.available) {
        void vscode.window.showErrorMessage(
          `Bootstrap Logics requires Python 3. ${buildMissingPythonMessage()} The extension can repair repository state but cannot install system tools automatically. Use \`Logics: Check Environment\` for details. Read-only Logics browsing remains available until bootstrap completes.`
        );
        return;
      }

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Bootstrap Logics",
          cancellable: false
        },
        async () => runGitWithOutput(root, ["rev-parse", "--is-inside-work-tree"])
      );
      const repoCheckDetail = `${result.stderr}\n${result.stdout}\n${result.error?.message || ""}`.trim();
      if (result.error || result.stdout.trim() !== "true") {
        if (isNotGitRepositoryDetail(repoCheckDetail) || result.stdout.trim() !== "true") {
          const choice = await vscode.window.showInformationMessage(
            "Bootstrap Logics requires a Git repository. This folder is not initialized yet. Run `git init` and continue bootstrap?",
            "Initialize Git",
            "Not now"
          );
          if (choice !== "Initialize Git") {
            return;
          }
          const initResult = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: "Bootstrap Logics",
              cancellable: false
            },
            async () => runGitWithOutput(root, ["init"])
          );
          if (initResult.error) {
            void vscode.window.showErrorMessage(`Bootstrap Logics failed while initializing Git: ${initResult.stderr || initResult.error.message}`);
            return;
          }
        } else {
          void vscode.window.showErrorMessage(`Bootstrap Logics failed: ${result.stderr || result.error?.message || result.stdout}`);
          return;
        }
      }

      if (result.error && !isNotGitRepositoryDetail(repoCheckDetail)) {
        void vscode.window.showErrorMessage(`Bootstrap Logics failed: ${result.stderr || result.error.message}`);
        return;
      }

      if (!fs.existsSync(scriptPath)) {
        const submoduleInspection = inspectLogicsKitSubmodule(root);
        const bootstrapCommand =
          submoduleInspection.exists && submoduleInspection.isCanonical
            ? "git submodule update --init --recursive -- logics/skills"
            : `git submodule add -b ${CANONICAL_LOGICS_KIT_BRANCH} ${CANONICAL_LOGICS_KIT_URL} ${LOGICS_SKILLS_SUBMODULE_PATH}`;
        const gitArgs =
          submoduleInspection.exists && submoduleInspection.isCanonical
            ? ["submodule", "update", "--init", "--recursive", "--", LOGICS_SKILLS_SUBMODULE_PATH]
            : ["submodule", "add", "-b", CANONICAL_LOGICS_KIT_BRANCH, CANONICAL_LOGICS_KIT_URL, LOGICS_SKILLS_SUBMODULE_PATH];

        if (bootstrapState.status === "noncanonical") {
          const choice = await vscode.window.showWarningMessage(
            `Bootstrap Logics is unavailable until the current logics/skills setup is repaired. ${bootstrapState.reason}`,
            "Copy Bootstrap Command"
          );
          if (choice === "Copy Bootstrap Command") {
            await vscode.env.clipboard.writeText(bootstrapCommand);
            void vscode.window.showInformationMessage("Bootstrap command copied to clipboard.");
          }
          return;
        }

        fs.mkdirSync(path.join(root, "logics"), { recursive: true });
        const installResult = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Bootstrap Logics",
            cancellable: false
          },
          async () => runGitWithOutput(root, gitArgs)
        );
        if (installResult.error) {
          const detail = `${installResult.stderr}\n${installResult.stdout}\n${installResult.error.message}`.trim();
          const choice = await vscode.window.showErrorMessage(
            `Bootstrap Logics failed while preparing the Logics kit. ${detail || installResult.error.message}`,
            "Copy Bootstrap Command"
          );
          if (choice === "Copy Bootstrap Command") {
            await vscode.env.clipboard.writeText(bootstrapCommand);
            void vscode.window.showInformationMessage("Bootstrap command copied to clipboard.");
          }
          return;
        }

        if (!fs.existsSync(scriptPath)) {
          const choice = await vscode.window.showErrorMessage(
            `Bootstrap prepared logics/skills, but logics/skills/logics.py is still missing in: ${root}.`,
            "Copy Bootstrap Command"
          );
          if (choice === "Copy Bootstrap Command") {
            await vscode.env.clipboard.writeText(bootstrapCommand);
            void vscode.window.showInformationMessage("Bootstrap command copied to clipboard.");
          }
          return;
        }
      }

      const bootstrapResult = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Bootstrap Logics",
          cancellable: false
        },
        async () => runPythonWithOutput(root, scriptPath, scriptArgs)
      );

      if (bootstrapResult.error) {
        const detail = `${bootstrapResult.stderr}\n${bootstrapResult.stdout}\n${bootstrapResult.error.message}`.trim();
        if (isMissingPythonFailureDetail(detail)) {
          void vscode.window.showErrorMessage(
            `Bootstrap Logics requires Python 3. ${buildMissingPythonMessage()} The extension can repair repository state but cannot install system tools automatically. Use \`Logics: Check Environment\` for details. Read-only Logics browsing remains available until bootstrap completes.`
          );
        } else {
          void vscode.window.showErrorMessage(`Bootstrap Logics failed: ${bootstrapResult.stderr || bootstrapResult.error.message}`);
        }
        return;
      }

      await this.options.refresh();

      const globalKitOutcome = await this.attemptBootstrapGlobalKitConvergence(root);
      await this.notifyBootstrapCompletion(root, globalKitOutcome);
      await this.maybeOfferBootstrapCommit(root, beforeBootstrapStatus.changedPaths);
    } finally {
      this.bootstrapInProgressRoots.delete(normalizedRoot);
      this.clearBootstrapPromptState(root);
    }
  }

  protected async inspectGlobalCodexKitPublishability(root: string): Promise<{
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>;
    changedPaths: string[];
  }> {
    return {
      snapshot: await inspectLogicsEnvironment(root),
      changedPaths: []
    };
  }

  protected async attemptBootstrapGlobalKitConvergence(root: string): Promise<BootstrapConvergenceOutcome> {
    const snapshot = await inspectLogicsEnvironment(root);
    const needsRepublish = shouldPublishRepoKit(root, snapshot.codexOverlay);
    if ((snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") && !needsRepublish) {
      return { attempted: false, published: false, failed: false };
    }
    if (!needsRepublish) {
      return { attempted: false, published: false, failed: false };
    }
    try {
      publishCodexWorkspaceOverlay(root);
      await this.options.refresh();
      const refreshed = await inspectLogicsEnvironment(root);
      return {
        attempted: true,
        published: refreshed.codexOverlay.status === "healthy" || refreshed.codexOverlay.status === "warning",
        failed: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        attempted: true,
        published: false,
        failed: true,
        failureMessage: message
      };
    }
  }

  protected async maybeOfferBootstrapCommit(root: string, beforeBootstrapStatus: string[]): Promise<void> {
    const changedPaths = await this.getGitChangedPaths(root);
    const bootstrapPaths = changedPaths.filter((filePath) => isBootstrapScopedPath(filePath));
    if (bootstrapPaths.length === 0) {
      return;
    }
    const hadPreExistingBootstrapChanges = beforeBootstrapStatus.some((filePath) => isBootstrapScopedPath(filePath));
    const commitMessage = buildBootstrapCommitMessage(
      beforeBootstrapStatus.length > 0 ? [...beforeBootstrapStatus, ...bootstrapPaths] : bootstrapPaths
    );
    const message = hadPreExistingBootstrapChanges
      ? `Bootstrap updated Logics files in this repository. Suggested commit message: ${commitMessage}`
      : `Bootstrap updated Logics files in this repository. Commit the bootstrap changes now with message: ${commitMessage}`;
    const choice = await vscode.window.showInformationMessage(
      message,
      ...(hadPreExistingBootstrapChanges ? ["Copy Commit Message"] : ["Commit Bootstrap Changes", "Copy Commit Message"])
    );
    if (choice === "Commit Bootstrap Changes") {
      await this.commitBootstrapChanges(root, bootstrapPaths, commitMessage);
      return;
    }
    if (choice !== "Copy Commit Message") {
      return;
    }

    await vscode.env.clipboard.writeText(commitMessage);
    void vscode.window.showInformationMessage(`Bootstrap commit message copied: ${commitMessage}`);
  }

  async notifyBootstrapCompletion(
    root: string,
    globalKitOutcome?: BootstrapConvergenceOutcome
  ): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if ((overlay.status === "healthy" || overlay.status === "warning") && !shouldPublishRepoKit(root, overlay)) {
      const detail = globalKitOutcome?.published ? " Global Codex kit publication completed during bootstrap." : "";
      void vscode.window.showInformationMessage(`Logics bootstrapped. Repo-local kit and the global Codex kit are ready.${detail} Refreshing.`);
      return;
    }
    const actions: string[] = [];
    if (overlay.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
    } else {
      actions.push("Publish Global Codex Kit");
    }
    const outcomeNote =
      globalKitOutcome?.failed && globalKitOutcome.failureMessage
        ? ` Automatic publication failed during bootstrap: ${globalKitOutcome.failureMessage}.`
        : globalKitOutcome?.attempted
          ? " Automatic publication ran during bootstrap, but the global kit still needs attention."
          : "";
    const message = `Logics bootstrapped partially. Repo-local kit is ready, but the global Codex kit is not ready yet. ${overlay.summary}${outcomeNote}`;
    const choice = actions.length > 0 ? await vscode.window.showInformationMessage(message, ...actions) : undefined;
    if (choice === "Publish Global Codex Kit") {
      await this.syncCodexOverlay(root, "bootstrap completion");
      return;
    }
    if (choice === "Update Logics Kit") {
      await this.updateLogicsKit(root, "bootstrap completion");
      return;
    }
    void vscode.window.showInformationMessage("Logics bootstrapped partially. Refreshing.");
  }

  protected async getGitChangedPaths(root: string): Promise<string[]> {
    const result = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (result.error) {
      return [];
    }
    return parseGitStatusEntries(result.stdout).map((entry) => entry.path);
  }

  protected async commitBootstrapChanges(root: string, changedPaths: string[], commitMessage: string): Promise<void> {
    const uniquePaths = [...new Set(changedPaths)];
    const addResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Commit Bootstrap Changes",
        cancellable: false
      },
      async () => runGitWithOutput(root, ["add", "-A", "--", ...uniquePaths])
    );
    if (addResult.error) {
      void vscode.window.showErrorMessage(
        `Failed to stage bootstrap changes: ${addResult.stderr || addResult.error.message}`
      );
      return;
    }

    const commitResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Commit Bootstrap Changes",
        cancellable: false
      },
      async () => runGitWithOutput(root, ["commit", "-m", commitMessage, "--only", "--", ...uniquePaths])
    );
    if (commitResult.error) {
      void vscode.window.showErrorMessage(
        `Failed to create bootstrap commit: ${commitResult.stderr || commitResult.error.message}`
      );
      return;
    }

    void vscode.window.showInformationMessage(`Created bootstrap commit: ${commitMessage}`);
  }

  protected async reconcileRepoBootstrapAfterKitUpdate(root: string): Promise<{
    attempted: boolean;
    applied: boolean;
    failureMessage?: string;
  }> {
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (bootstrapState.status !== "canonical" || !bootstrapState.canBootstrap) {
      return { attempted: false, applied: false };
    }

    const scriptPath = path.join(root, "logics", "skills", "logics.py");
    if (!fs.existsSync(scriptPath)) {
      return {
        attempted: true,
        applied: false,
        failureMessage: "Bootstrap script is missing after the kit update."
      };
    }

    const result = await runPythonWithOutput(root, scriptPath, ["bootstrap"]);
    if (result.error) {
      return {
        attempted: true,
        applied: false,
        failureMessage: result.stderr || result.error.message
      };
    }

    await this.options.refresh();
    return { attempted: true, applied: true };
  }

  protected appendBootstrapConvergenceNote(
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

  protected codexKitNeedsRepublish(root: string, overlay: Awaited<ReturnType<typeof inspectLogicsEnvironment>>["codexOverlay"]): boolean {
    return shouldPublishRepoKit(root, overlay);
  }
}
