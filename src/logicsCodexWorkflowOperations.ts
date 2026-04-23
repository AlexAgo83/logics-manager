import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repairClaudeBridgeFiles } from "./claudeBridgeSupport";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import { detectDangerousGitignorePatterns, inspectLogicsBootstrapState, runGitWithOutput } from "./logicsProviderUtils";
import { buildLogicsKitUpdateCommand } from "./logicsProviderUtils";
import {
  appendBootstrapConvergenceNote,
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
      if (inspectLogicsBootstrapState(root).canBootstrap) {
        actions.push("Update Logics Runtime");
      }
      actions.push("Copy Update Command", "Not now");
      const choice = await vscode.window.showInformationMessage(
        `This repository already has Logics, but it cannot act as a healthy global Codex runtime source yet. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Runtime") {
        await this.updateLogicsKit(root, "startup remediation");
        return;
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
      }
      return;
    }

    if (overlay.status === "missing-overlay" || overlay.status === "stale" || needsRepublish) {
      const published = await this.ensureGlobalCodexKit(root);
      if (published) {
        this.clearCodexRemediationPromptState(root);
        return;
      }
      void vscode.window.showWarningMessage(`Global Codex runtime still needs attention. ${overlay.summary}`);
      return;
    }

    if (inspectLogicsBootstrapState(root).canBootstrap) {
      actions.push("Update Logics Runtime");
    }
    actions.push("Copy Update Command");
    const choice = await vscode.window.showInformationMessage(
      `Global Codex runtime needs attention for this repository. ${overlay.summary}`,
      ...actions
    );
    if (choice === "Update Logics Runtime") {
      await this.updateLogicsKit(root, "startup remediation");
      return;
    }
    if (choice === "Copy Update Command") {
      await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
      void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
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
      const actions: string[] = [];
      if (inspectLogicsBootstrapState(root).canBootstrap) {
        actions.push("Update Logics Runtime");
      }
      const updateCommand = buildLogicsKitUpdateCommand();
      actions.push("Copy Update Command");
      const choice = await vscode.window.showInformationMessage(
        `Repo-local Logics is ready after ${trigger}, but the current runtime cannot yet publish a healthy global Codex runtime. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Runtime") {
        await this.updateLogicsKit(root, trigger);
        return;
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
      }
      return;
    }

    const choice = await vscode.window.showInformationMessage(
      `Repo-local Logics is ready after ${trigger}, but the global Codex runtime still needs publication or repair. ${overlay.summary}`,
      "Publish Global Codex Runtime"
    );
    if (choice === "Publish Global Codex Runtime") {
      await this.syncCodexOverlay(root, trigger);
    }
  }

  async updateLogicsKit(root: string, trigger: string): Promise<boolean> {
    const gitVersion = await runGitWithOutput(root, ["--version"]);
    if (gitVersion.error) {
      const detail = `${gitVersion.stderr}\n${gitVersion.stdout}\n${gitVersion.error.message}`.trim();
      if (isMissingGitFailureDetail(detail)) {
        void vscode.window.showErrorMessage(
          `Updating the Logics runtime requires Git. ${buildMissingGitMessage()} The extension cannot install Git automatically. Use \`Logics: Check Environment\` for details.`
        );
        return false;
      }
      void vscode.window.showErrorMessage(`Failed to run git: ${gitVersion.stderr || gitVersion.error.message}`);
      return false;
    }

    const updateCommand = buildLogicsKitUpdateCommand();

    const repoCheck = await runGitWithOutput(root, ["rev-parse", "--is-inside-work-tree"]);
    if (repoCheck.error || repoCheck.stdout.trim() !== "true") {
      const choice = await vscode.window.showWarningMessage(
        "Automatic Logics runtime update requires a git worktree rooted at the selected project. Use the canonical runtime update command manually if needed.",
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
      }
      return false;
    }

    const rootStatus = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (rootStatus.error) {
      void vscode.window.showErrorMessage(
        `Failed to inspect repository state before updating the Logics runtime: ${rootStatus.stderr || rootStatus.error.message}`
      );
      return false;
    }
    const rootStatusEntries = parseGitStatusEntries(rootStatus.stdout);
    const hasUnrelatedRootChanges = rootStatusEntries.length > 0;

    const fallbackResult = await fallbackInstallKit(root);
    if (!fallbackResult.installed) {
      const failureMessage = fallbackResult.failureMessage || "The runtime repair could not complete.";
      void vscode.window.showErrorMessage(`Failed to update the Logics runtime. ${failureMessage}`);
      return false;
    }

    await this.options.refresh();

    const bootstrapConvergence = await this.reconcileRepoBootstrapAfterKitUpdate(root);
    const snapshot = await inspectLogicsEnvironment(root);
    const rootChangeNote = hasUnrelatedRootChanges ? " Existing repository changes were left untouched." : "";
    const message = `Logics runtime updated after ${trigger} by running the bundled bootstrap. Review and commit the bootstrap changes in your repository when ready.${rootChangeNote}`;
    const messageWithConvergence = appendBootstrapConvergenceNote(message, bootstrapConvergence);
    const choice =
      snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning"
        ? await vscode.window.showInformationMessage(messageWithConvergence, "Publish Global Codex Runtime")
        : undefined;
    if (choice === "Publish Global Codex Runtime") {
      await this.syncCodexOverlay(root, "runtime update");
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
      void vscode.window.showInformationMessage("Global Codex runtime is already ready for this repository.");
      return true;
    }

    if (overlay.status === "missing-manager") {
      const actions: string[] = [];
      if (inspectLogicsBootstrapState(root).canBootstrap) {
        actions.push("Update Logics Runtime");
      }
      actions.push("Copy Update Command");
      const choice = await vscode.window.showWarningMessage(
        `Global Codex runtime publication is unavailable because the Logics runtime in this repository is not a healthy publication source yet. ${overlay.summary}`,
        ...actions
      );
      if (choice === "Update Logics Runtime") {
        await this.updateLogicsKit(root, trigger);
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
      }
      return false;
    }

    try {
      publishCodexWorkspaceOverlay(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Global Codex runtime publish failed: ${message}`);
      return false;
    }

    await this.options.refresh();
    const refreshed = await inspectLogicsEnvironment(root);
    if (refreshed.codexOverlay.status === "healthy" || refreshed.codexOverlay.status === "warning") {
      if (options?.autoLaunchOnSuccess && refreshed.codexOverlay.runCommand) {
        launchCodexOverlayTerminal(root, refreshed.codexOverlay.runCommand);
        void vscode.window.showInformationMessage(`Global Codex runtime published after ${trigger}. Launching Codex in Terminal.`);
        return true;
      }
      const actions = refreshed.codexOverlay.runCommand
        ? ["Launch Codex in Terminal", "Copy Codex Launch Command"]
        : [];
      const choice = actions.length > 0
        ? await vscode.window.showInformationMessage(
            `Global Codex runtime published after ${trigger}. ${refreshed.codexOverlay.summary}`,
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
        void vscode.window.showInformationMessage(`Global Codex runtime published. ${refreshed.codexOverlay.summary}`);
      }
      return true;
    }

    void vscode.window.showWarningMessage(
      `Global Codex runtime publish completed, but the runtime still needs attention. ${refreshed.codexOverlay.summary}`
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
      void vscode.window.showWarningMessage("Global Claude runtime state is unavailable for this repository.");
      return false;
    }

    if (globalKit.status === "healthy" && !options?.forceRepublish) {
      if (options?.autoLaunchOnSuccess) {
        launchClaudeTerminal(root, "claude");
        return true;
      }
      void vscode.window.showInformationMessage("Global Claude runtime is already ready for this repository.");
      return true;
    }

    if (globalKit.status === "missing-manager") {
      const actions: string[] = [];
      if (inspectLogicsBootstrapState(root).canBootstrap) {
        actions.push("Update Logics Runtime");
      }
      actions.push("Copy Update Command");
      const choice = await vscode.window.showWarningMessage(
        `Global Claude runtime publication is unavailable because the Logics runtime in this repository is not a healthy publication source yet. ${globalKit.summary}`,
        ...actions
      );
      if (choice === "Update Logics Runtime") {
        await this.updateLogicsKit(root, trigger);
      }
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
        void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
      }
      return false;
    }

    try {
      publishClaudeGlobalKit(root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Global Claude runtime publish failed: ${message}`);
      return false;
    }

    await this.options.refresh();
    const refreshed = await inspectLogicsEnvironment(root);
    if (refreshed.claudeGlobalKit?.status === "healthy") {
      if (options?.autoLaunchOnSuccess) {
        launchClaudeTerminal(root, "claude");
        void vscode.window.showInformationMessage(`Global Claude runtime published after ${trigger}. Launching Claude in Terminal.`);
        return true;
      }
      const choice = await vscode.window.showInformationMessage(
        `Global Claude runtime published after ${trigger}. ${refreshed.claudeGlobalKit.summary}`,
        "Launch Claude in Terminal"
      );
      if (choice === "Launch Claude in Terminal") {
        launchClaudeTerminal(root, "claude");
        return true;
      }
      void vscode.window.showInformationMessage(`Global Claude runtime published. ${refreshed.claudeGlobalKit.summary}`);
      return true;
    }

    void vscode.window.showWarningMessage(
      `Global Claude runtime publish completed, but the runtime still needs attention. ${refreshed.claudeGlobalKit?.summary || "Unknown state."}`
    );
    return false;
  }

  async repairLogicsKit(root: string): Promise<boolean> {
    let snapshot = await inspectLogicsEnvironment(root);
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (snapshot.codexOverlay.status === "missing-manager" || snapshot.claudeGlobalKit?.status === "missing-manager") {
      if (!bootstrapState.canBootstrap) {
        const choice = await vscode.window.showWarningMessage(
          `Repair Logics runtime requires a bootstrappable local runtime. ${bootstrapState.reason}`,
          "Copy Update Command"
        );
        if (choice === "Copy Update Command") {
          await vscode.env.clipboard.writeText(buildLogicsKitUpdateCommand());
          void vscode.window.showInformationMessage("Logics runtime update command copied to clipboard.");
        }
        return false;
      }

      const updated = await this.updateLogicsKit(root, "manual repair");
      if (!updated) {
        return false;
      }
      snapshot = await inspectLogicsEnvironment(root);
    }

    const bridgeRepair = await repairClaudeBridgeFiles(root);
    if (bridgeRepair.failureMessage) {
      void vscode.window.showErrorMessage(`Failed to restore Claude bridge files from the bundled runtime. ${bridgeRepair.failureMessage}`);
      return false;
    }
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
        void vscode.window.showErrorMessage(`Global Codex runtime publish failed: ${message}`);
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
        void vscode.window.showErrorMessage(`Global Claude runtime publish failed: ${message}`);
        return false;
      }
    }

    const codexReady = snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning";
    const claudeReady = snapshot.claudeGlobalKit?.status === "healthy";
    if (codexReady && claudeReady) {
      if (bridgeRepair.writtenPaths.length > 0) {
        void vscode.window.showInformationMessage(
          `Repair Logics runtime restored Claude bridge files: ${bridgeRepair.writtenPaths.join(", ")}`
        );
        return true;
      }
      if (changed) {
        void vscode.window.showInformationMessage("Logics runtime repair completed for Codex and Claude.");
        return true;
      }
      if (bridgeRepair.skippedVariants.length > 0) {
        void vscode.window.showWarningMessage(
          `Repair Logics runtime could not restore Claude bridge files for: ${bridgeRepair.skippedVariants.join(", ")}.`
        );
        return false;
      }
      void vscode.window.showInformationMessage("Logics runtime is already healthy for this repository.");
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
        void vscode.window.showWarningMessage(`Automatic global Codex runtime publish failed: ${message}`);
      }
      return false;
    }
  }

}
