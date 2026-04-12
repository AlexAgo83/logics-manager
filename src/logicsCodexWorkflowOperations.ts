import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repairClaudeBridgeFiles } from "./claudeBridgeSupport";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import { detectDangerousGitignorePatterns, inspectLogicsKitSubmodule, runGitWithOutput } from "./logicsProviderUtils";
import { buildLogicsKitUpdateCommand, detectKitInstallType } from "./logicsProviderUtils";
import {
  appendBootstrapConvergenceNote,
  ensureCanonicalGitmodules,
  fallbackInstallKit
} from "./logicsCodexWorkflowKitSupport";
import { publishClaudeGlobalKit } from "./logicsClaudeGlobalKit";
import { publishCodexWorkspaceOverlay, shouldPublishRepoKit } from "./logicsCodexWorkspace";
import { maybeShowReadyCodexOverlayHandoff, launchClaudeTerminal, launchCodexOverlayTerminal } from "./logicsOverlaySupport";
import { LogicsCodexWorkflowBootstrapSupport, LogicsCodexWorkflowBootstrapOptions } from "./logicsCodexWorkflowBootstrapSupport";
import { parseGitStatusEntries } from "./workflowSupport";

export type LogicsCodexWorkflowOperationsOptions = LogicsCodexWorkflowBootstrapOptions;

export class LogicsCodexWorkflowOperations extends LogicsCodexWorkflowBootstrapSupport {
  private readonly codexRemediationPromptedKeys = new Set<string>();

  constructor(protected readonly options: LogicsCodexWorkflowOperationsOptions) {
    super(options);
  }

  clearCodexRemediationPromptState(root: string): void {
    const normalized = path.resolve(root);
    this.codexRemediationPromptedKeys.forEach((key) => {
      if (key === normalized || key.startsWith(`${normalized}::`)) {
        this.codexRemediationPromptedKeys.delete(key);
      }
    });
  }

  async maybeOfferCodexStartupRemediation(root: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    this.maybeShowDangerousGitignoreWarning(root);
    const overlay = snapshot.codexOverlay;
    const needsRepublish = this.codexKitNeedsRepublish(root, overlay);
    if ((overlay.status === "healthy" || overlay.status === "warning") && !needsRepublish || overlay.status === "unavailable") {
      this.clearCodexRemediationPromptState(root);
      return;
    }

    const key = `${path.resolve(root)}::${overlay.status}`;
    if (this.codexRemediationPromptedKeys.has(key)) {
      return;
    }
    this.codexRemediationPromptedKeys.add(key);

    const actions: string[] = [];
    if (overlay.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
      actions.push("Copy Update Command", "Not now");
      const choice = await vscode.window.showInformationMessage(
        `This repository already has Logics, but it cannot act as a healthy global Codex kit source yet. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Kit") {
        await this.updateLogicsKit(root, "startup remediation");
        return;
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return;
    }

    if (overlay.status === "missing-overlay" || overlay.status === "stale" || needsRepublish) {
      const published = await this.ensureGlobalCodexKit(root);
      if (published) {
        this.clearCodexRemediationPromptState(root);
        return;
      }
      void vscode.window.showWarningMessage(`Global Codex kit still needs attention. ${overlay.summary}`);
      return;
    }

    const inspection = inspectLogicsKitSubmodule(root);
    if (inspection.exists && inspection.isCanonical) {
      actions.push("Update Logics Kit");
    }
    actions.push("Copy Update Command");
    const choice = await vscode.window.showInformationMessage(
      `Global Codex kit needs attention for this repository. ${overlay.summary}`,
      ...actions
    );
    if (choice === "Update Logics Kit") {
      await this.updateLogicsKit(root, "startup remediation");
      return;
    }
    if (choice === "Copy Update Command") {
      await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
      void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
    }
  }

  async maybeShowCodexOverlayHandoff(root: string, trigger: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if ((overlay.status === "healthy" || overlay.status === "warning") && !this.codexKitNeedsRepublish(root, overlay)) {
      await maybeShowReadyCodexOverlayHandoff(root, trigger, overlay);
      return;
    }

    if (overlay.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      const actions: string[] = [];
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
      const updateCommand = buildLogicsKitUpdateCommand();
      actions.push("Copy Update Command");
      const choice = await vscode.window.showInformationMessage(
        `Repo-local Logics is ready after ${trigger}, but the current kit cannot yet publish a healthy global Codex kit. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Kit") {
        await this.updateLogicsKit(root, trigger);
        return;
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return;
    }

    const choice = await vscode.window.showInformationMessage(
      `Repo-local Logics is ready after ${trigger}, but the global Codex kit still needs publication or repair. ${overlay.summary}`,
      "Publish Global Codex Kit"
    );
    if (choice === "Publish Global Codex Kit") {
      await this.syncCodexOverlay(root, trigger);
    }
  }

  async updateLogicsKit(root: string, trigger: string): Promise<boolean> {
    const gitVersion = await runGitWithOutput(root, ["--version"]);
    if (gitVersion.error) {
      const detail = `${gitVersion.stderr}\n${gitVersion.stdout}\n${gitVersion.error.message}`.trim();
      if (isMissingGitFailureDetail(detail)) {
        void vscode.window.showErrorMessage(
          `Updating the Logics kit requires Git. ${buildMissingGitMessage()} The extension cannot install Git automatically. Use \`Logics: Check Environment\` for details.`
        );
        return false;
      }
      void vscode.window.showErrorMessage(`Failed to run git: ${gitVersion.stderr || gitVersion.error.message}`);
      return false;
    }

    const inspection = inspectLogicsKitSubmodule(root);
    const updateCommand = buildLogicsKitUpdateCommand();
    const installType = detectKitInstallType(root);

    const repoCheck = await runGitWithOutput(root, ["rev-parse", "--is-inside-work-tree"]);
    if (repoCheck.error || repoCheck.stdout.trim() !== "true") {
      const choice = await vscode.window.showWarningMessage(
        "Automatic Logics kit update requires a git worktree rooted at the selected project. Use the canonical submodule update command manually if needed.",
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    const rootStatus = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (rootStatus.error) {
      void vscode.window.showErrorMessage(
        `Failed to inspect repository state before updating the Logics kit: ${rootStatus.stderr || rootStatus.error.message}`
      );
      return false;
    }
    const rootStatusEntries = parseGitStatusEntries(rootStatus.stdout);
    const hasSkillsChangesInRoot = rootStatusEntries.some(
      (entry) => entry.path === "logics/skills" || entry.path.startsWith("logics/skills/")
    );
    const hasOtherRootChanges = rootStatusEntries.some((entry) => !entry.path.startsWith("logics/skills"));
    if (hasSkillsChangesInRoot) {
      const choice = await vscode.window.showWarningMessage(
        "Automatic Logics kit update is blocked because the logics/skills submodule has uncommitted changes. Commit or stash them first, or run the submodule update manually.",
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    if (installType === "standalone-clone") {
      const skillsStatus = await runGitWithOutput(root, ["-C", "logics/skills", "status", "--porcelain"]);
      if (!skillsStatus.error && skillsStatus.stdout.trim()) {
        void vscode.window.showWarningMessage(
          "Automatic Logics kit update is blocked: the standalone kit clone has uncommitted changes. Commit or stash them first."
        );
        return false;
      }

      const pullResult = await runGitWithOutput(root, ["-C", "logics/skills", "pull", "origin", "main"]);
      if (pullResult.error) {
        const detail = `${pullResult.stderr}\n${pullResult.stdout}\n${pullResult.error.message}`.trim();
        const choice = await vscode.window.showErrorMessage(
          `Failed to update the standalone Logics kit clone. ${detail || pullResult.error.message}`,
          "Copy Update Command"
        );
        if (choice === "Copy Update Command") {
          await vscode.env.clipboard.writeText(updateCommand);
          void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
        }
        return false;
      }

      if (!detectDangerousGitignorePatterns(root).hasDangerousPatterns) {
        ensureCanonicalGitmodules(root);
      }
      await this.options.refresh();
      const bootstrapConvergence = await this.reconcileRepoBootstrapAfterKitUpdate(root);
      const rootChangeNote = hasOtherRootChanges ? " Unrelated root changes were left untouched." : "";
      const messageWithConvergence = appendBootstrapConvergenceNote(
        `Logics kit updated after ${trigger}. Review and commit the standalone clone changes in your repository when ready.${rootChangeNote}`,
        bootstrapConvergence
      );
      void vscode.window.showInformationMessage(messageWithConvergence);
      return true;
    }

    if (installType === "plain-copy" || !inspection.exists || !inspection.isCanonical) {
      if (!detectDangerousGitignorePatterns(root).hasDangerousPatterns) {
        const choice = await vscode.window.showWarningMessage(
          `Automatic Logics kit update is only supported for the canonical logics/skills submodule. ${inspection.reason}`,
          "Copy Update Command"
        );
        if (choice === "Copy Update Command") {
          await vscode.env.clipboard.writeText(updateCommand);
          void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
        }
        return false;
      }

      const choice = await vscode.window.showWarningMessage(
        `logics/ appears to be gitignored and the canonical submodule is not functional. ${inspection.reason} Install or refresh the kit via fallback copy or clone?`,
        "Install Fallback",
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
        return false;
      }
      if (choice !== "Install Fallback") {
        return false;
      }

      const fallbackResult = await fallbackInstallKit(root);
      if (!fallbackResult.installed) {
        const failureMessage = fallbackResult.failureMessage || "The fallback install could not complete.";
        void vscode.window.showErrorMessage(`Failed to install the fallback Logics kit. ${failureMessage}`);
        return false;
      }

      await this.options.refresh();
      const bootstrapConvergence = await this.reconcileRepoBootstrapAfterKitUpdate(root);
      const snapshot = await inspectLogicsEnvironment(root);
      const message =
        fallbackResult.method === "copy"
          ? `Logics kit updated after ${trigger} from the ${fallbackResult.sourceLabel || "global"} kit.`
          : `Logics kit updated after ${trigger} by cloning the canonical kit repository.`;
      const messageWithConvergence = appendBootstrapConvergenceNote(message, bootstrapConvergence);
      if (snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") {
        void vscode.window.showInformationMessage(messageWithConvergence);
      } else {
        const choice = await vscode.window.showInformationMessage(messageWithConvergence, "Publish Global Codex Kit");
        if (choice === "Publish Global Codex Kit") {
          await this.syncCodexOverlay(root, "kit update");
        }
      }
      return true;
    }

    const beforeStatus = await runGitWithOutput(root, ["submodule", "status", "--", "logics/skills"]);
    if (beforeStatus.error) {
      const choice = await vscode.window.showWarningMessage(
        `The plugin could not confirm the canonical logics/skills submodule before updating it. ${beforeStatus.stderr || beforeStatus.error.message}`,
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    const updateResult = await runGitWithOutput(root, ["submodule", "update", "--init", "--remote", "--merge", "--", "logics/skills"]);
    if (updateResult.error) {
      const detail = `${updateResult.stderr}\n${updateResult.stdout}`.trim();
      const choice = await vscode.window.showErrorMessage(
        `Failed to update the Logics kit. ${detail || updateResult.error.message}`,
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    const afterStatus = await runGitWithOutput(root, ["submodule", "status", "--", "logics/skills"]);
    const updated = beforeStatus.stdout.trim() !== afterStatus.stdout.trim();
    await this.options.refresh();

    const bootstrapConvergence = await this.reconcileRepoBootstrapAfterKitUpdate(root);
    const snapshot = await inspectLogicsEnvironment(root);
    const rootChangeNote = hasOtherRootChanges ? " Unrelated root changes were left untouched." : "";

    if (snapshot.codexOverlay.status === "missing-manager") {
      void vscode.window.showWarningMessage(
        updated
          ? "The Logics kit submodule updated, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
          : "The Logics kit is already at the current tracked submodule revision, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
      );
      return true;
    }

    const message = updated
      ? `Logics kit updated after ${trigger}. Review and commit the submodule pointer change in your repository when ready.${rootChangeNote}`
      : `The Logics kit is already up to date on the tracked submodule revision.${rootChangeNote}`;
    const messageWithConvergence = appendBootstrapConvergenceNote(message, bootstrapConvergence);
    const choice =
      snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning"
        ? await vscode.window.showInformationMessage(messageWithConvergence, "Publish Global Codex Kit")
        : undefined;
    if (choice === "Publish Global Codex Kit") {
      await this.syncCodexOverlay(root, "kit update");
    } else {
      void vscode.window.showInformationMessage(messageWithConvergence);
    }
    return true;
  }

  async syncCodexOverlay(
    root: string,
    trigger: string,
    options?: {
      autoLaunchOnSuccess?: boolean;
      forceRepublish?: boolean;
    }
  ): Promise<boolean> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    const needsRepublish = this.codexKitNeedsRepublish(root, overlay);
    if ((overlay.status === "healthy" || overlay.status === "warning") && !options?.forceRepublish && !needsRepublish) {
      if (options?.autoLaunchOnSuccess && overlay.runCommand) {
        launchCodexOverlayTerminal(root, overlay.runCommand);
        return true;
      }
      void vscode.window.showInformationMessage("Global Codex kit is already ready for this repository.");
      return true;
    }

    if (overlay.status === "missing-manager") {
      const inspection = inspectLogicsKitSubmodule(root);
      const actions: string[] = [];
      if (inspection.exists && inspection.isCanonical) {
        actions.push("Update Logics Kit");
      }
      actions.push("Copy Update Command");
      const choice = await vscode.window.showWarningMessage(
        `Global Codex kit publication is unavailable because the Logics kit in this repository is not a healthy publication source yet. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Kit") {
        await this.updateLogicsKit(root, trigger);
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    try {
      publishCodexWorkspaceOverlay(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Global Codex kit publish failed: ${message}`);
      return false;
    }

    await this.options.refresh();
    const refreshed = await inspectLogicsEnvironment(root);
    if (refreshed.codexOverlay.status === "healthy" || refreshed.codexOverlay.status === "warning") {
      if (options?.autoLaunchOnSuccess && refreshed.codexOverlay.runCommand) {
        launchCodexOverlayTerminal(root, refreshed.codexOverlay.runCommand);
        void vscode.window.showInformationMessage(`Global Codex kit published after ${trigger}. Launching Codex in Terminal.`);
        return true;
      }
      const actions = refreshed.codexOverlay.runCommand
        ? ["Launch Codex in Terminal", "Copy Codex Launch Command"]
        : [];
      const choice = actions.length > 0
        ? await vscode.window.showInformationMessage(
            `Global Codex kit published after ${trigger}. ${refreshed.codexOverlay.summary}`,
            ...actions
          )
        : undefined;
      if (choice === "Launch Codex in Terminal" && refreshed.codexOverlay.runCommand) {
        launchCodexOverlayTerminal(root, refreshed.codexOverlay.runCommand);
        return true;
      }
      if (choice === "Copy Codex Launch Command" && refreshed.codexOverlay.runCommand) {
        await vscode.env.clipboard.writeText(refreshed.codexOverlay.runCommand);
        void vscode.window.showInformationMessage("Codex launch command copied to clipboard.");
      }
      if (!choice) {
        void vscode.window.showInformationMessage(`Global Codex kit published. ${refreshed.codexOverlay.summary}`);
      }
      return true;
    }

    void vscode.window.showWarningMessage(
      `Global Codex kit publish completed, but the runtime still needs attention. ${refreshed.codexOverlay.summary}`
    );
    return false;
  }

  async syncClaudeGlobalKit(
    root: string,
    trigger: string,
    options?: {
      autoLaunchOnSuccess?: boolean;
      forceRepublish?: boolean;
    }
  ): Promise<boolean> {
    const snapshot = await inspectLogicsEnvironment(root);
    const globalKit = snapshot.claudeGlobalKit;
    if (!globalKit) {
      void vscode.window.showWarningMessage("Global Claude kit state is unavailable for this repository.");
      return false;
    }

    if (globalKit.status === "healthy" && !options?.forceRepublish) {
      if (options?.autoLaunchOnSuccess) {
        launchClaudeTerminal(root, "claude");
        return true;
      }
      void vscode.window.showInformationMessage("Global Claude kit is already ready for this repository.");
      return true;
    }

    if (globalKit.status === "missing-manager") {
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
        await this.updateLogicsKit(root, trigger);
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
    }

    try {
      publishClaudeGlobalKit(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Global Claude kit publish failed: ${message}`);
      return false;
    }

    await this.options.refresh();
    const refreshed = await inspectLogicsEnvironment(root);
    if (refreshed.claudeGlobalKit?.status === "healthy") {
      if (options?.autoLaunchOnSuccess) {
        launchClaudeTerminal(root, "claude");
        void vscode.window.showInformationMessage(`Global Claude kit published after ${trigger}. Launching Claude in Terminal.`);
        return true;
      }
      const choice = await vscode.window.showInformationMessage(
        `Global Claude kit published after ${trigger}. ${refreshed.claudeGlobalKit.summary}`,
        "Launch Claude in Terminal"
      );
      if (choice === "Launch Claude in Terminal") {
        launchClaudeTerminal(root, "claude");
        return true;
      }
      void vscode.window.showInformationMessage(`Global Claude kit published. ${refreshed.claudeGlobalKit.summary}`);
      return true;
    }

    void vscode.window.showWarningMessage(
      `Global Claude kit publish completed, but the runtime still needs attention. ${refreshed.claudeGlobalKit?.summary || "Unknown state."}`
    );
    return false;
  }

  async repairLogicsKit(root: string): Promise<boolean> {
    let snapshot = await inspectLogicsEnvironment(root);
    const inspection = inspectLogicsKitSubmodule(root);
    if (snapshot.codexOverlay.status === "missing-manager" || snapshot.claudeGlobalKit?.status === "missing-manager") {
      if (!inspection.exists || !inspection.isCanonical) {
        const choice = await vscode.window.showWarningMessage(
          `Repair Logics Kit requires the canonical logics/skills submodule. ${inspection.reason}`,
          "Copy Update Command"
        );
        if (choice === "Copy Update Command") {
          await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
          void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
        }
        return false;
      }

      const updated = await this.updateLogicsKit(root, "manual repair");
      if (!updated) {
        return false;
      }
      snapshot = await inspectLogicsEnvironment(root);
    }

    const bridgeRepair = repairClaudeBridgeFiles(root);
    if (bridgeRepair.writtenPaths.length > 0) {
      await this.options.refresh();
      snapshot = await inspectLogicsEnvironment(root);
    }

    let changed = bridgeRepair.writtenPaths.length > 0;

    if (snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning") {
      try {
        publishCodexWorkspaceOverlay(root);
        changed = true;
        await this.options.refresh();
        snapshot = await inspectLogicsEnvironment(root);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Global Codex kit publish failed: ${message}`);
        return false;
      }
    }

    if (snapshot.claudeGlobalKit?.status && snapshot.claudeGlobalKit.status !== "healthy") {
      try {
        publishClaudeGlobalKit(root);
        changed = true;
        await this.options.refresh();
        snapshot = await inspectLogicsEnvironment(root);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Global Claude kit publish failed: ${message}`);
        return false;
      }
    }

    const codexReady = snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning";
    const claudeReady = snapshot.claudeGlobalKit?.status === "healthy";
    if (codexReady && claudeReady) {
      if (bridgeRepair.writtenPaths.length > 0) {
        void vscode.window.showInformationMessage(
          `Repair Logics Kit restored Claude bridge files: ${bridgeRepair.writtenPaths.join(", ")}`
        );
        return true;
      }
      if (changed) {
        void vscode.window.showInformationMessage("Logics kit runtime repair completed for Codex and Claude.");
        return true;
      }
      if (bridgeRepair.skippedVariants.length > 0) {
        void vscode.window.showWarningMessage(
          `Repair Logics Kit could not restore Claude bridge files because required skill packages are missing for: ${bridgeRepair.skippedVariants.join(", ")}.`
        );
        return false;
      }
      void vscode.window.showInformationMessage("Logics kit runtime is already healthy for this repository.");
      return true;
    }

    if (!codexReady) {
      return this.syncCodexOverlay(root, "manual repair", { forceRepublish: true });
    }
    return this.syncClaudeGlobalKit(root, "manual repair", { forceRepublish: true });
  }

  async ensureGlobalCodexKit(root: string): Promise<boolean> {
    const snapshot = await inspectLogicsEnvironment(root);
    const needsRepublish = this.codexKitNeedsRepublish(root, snapshot.codexOverlay);
    if ((snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") && !needsRepublish) {
      return true;
    }
    if (!needsRepublish) {
      return false;
    }
    try {
      publishCodexWorkspaceOverlay(root);
      await this.options.refresh();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const key = `${path.resolve(root)}::global-kit-autopublish-failed`;
      if (!this.codexRemediationPromptedKeys.has(key)) {
        this.codexRemediationPromptedKeys.add(key);
        void vscode.window.showWarningMessage(`Automatic global Codex kit publish failed: ${message}`);
      }
      return false;
    }
  }

}
