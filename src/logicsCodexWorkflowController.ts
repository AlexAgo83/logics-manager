import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { repairClaudeBridgeFiles } from "./claudeBridgeSupport";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import {
  buildLogicsKitUpdateCommand,
  inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule,
  runGitWithOutput,
  runPythonWithOutput
} from "./logicsProviderUtils";
import { publishCodexWorkspaceOverlay, shouldPublishRepoKit } from "./logicsCodexWorkspace";
import { maybeShowReadyCodexOverlayHandoff, launchClaudeTerminal, launchCodexOverlayTerminal } from "./logicsOverlaySupport";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { inspectRuntimeLaunchers } from "./runtimeLaunchers";
import { buildBootstrapCommitMessage, isBootstrapScopedPath, parseGitStatusEntries } from "./workflowSupport";

type BootstrapConvergenceOutcome = {
  attempted: boolean;
  published: boolean;
  failed: boolean;
  failureMessage?: string;
};

type CodexWorkflowControllerOptions = {
  refresh: () => Promise<void>;
};

export class LogicsCodexWorkflowController {
  private readonly bootstrapPromptedRoots = new Set<string>();
  private readonly codexRemediationPromptedKeys = new Set<string>();

  constructor(private readonly options: CodexWorkflowControllerOptions) {}

  clearCodexRemediationPromptState(root: string): void {
    const normalized = path.resolve(root);
    this.codexRemediationPromptedKeys.forEach((key) => {
      if (key === normalized || key.startsWith(`${normalized}::`)) {
        this.codexRemediationPromptedKeys.delete(key);
      }
    });
  }

  async maybeOfferBootstrap(root: string): Promise<void> {
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (bootstrapState.status === "canonical") {
      return;
    }

    const promptKey = `${root}::${bootstrapState.status}`;
    if (this.bootstrapPromptedRoots.has(promptKey)) {
      return;
    }
    this.bootstrapPromptedRoots.add(promptKey);

    if (bootstrapState.status === "noncanonical") {
      void vscode.window.showWarningMessage(
        `This repository already has a non-canonical or malformed logics/skills setup. ${bootstrapState.reason} Use Check Environment for repair guidance.`
      );
      return;
    }

    const action = "Bootstrap Logics";
    const message =
      bootstrapState.promptMessage ??
      "No logics/ folder found. Bootstrap Logics by adding the cdx-logics-kit submodule?";
    const choice = await vscode.window.showInformationMessage(
      message,
      action
      ,
      "Not now"
    );
    if (choice !== action) {
      return;
    }

    await this.bootstrapLogics(root);
  }

  async maybeOfferCodexStartupRemediation(root: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning" || overlay.status === "unavailable") {
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
      const actions: string[] = [];
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

    if (overlay.status === "missing-overlay" || overlay.status === "stale") {
      const published = await this.ensureGlobalCodexKit(root);
      if (published) {
        this.clearCodexRemediationPromptState(root);
        return;
      }
      void vscode.window.showWarningMessage(`Global Codex kit still needs attention. ${overlay.summary}`);
      return;
    }

    {
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
  }

  async launchCodexFromTools(root: string): Promise<void> {
    const launchers = await inspectRuntimeLaunchers(root);
    if (!launchers.codex.available && launchers.codex.title === "Codex CLI not found on PATH") {
      void vscode.window.showWarningMessage(launchers.codex.title);
      return;
    }

    const snapshot = await inspectLogicsEnvironment(root);
    const globalKit = snapshot.codexOverlay;
    if (globalKit.status === "healthy" || globalKit.status === "warning") {
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
    if (!launchers.claude.available) {
      const actions =
        launchers.claude.title.includes("Repair Logics Kit")
          ? ["Repair Logics Kit"]
          : [];
      const choice = await vscode.window.showWarningMessage(launchers.claude.title, ...actions);
      if (choice === "Repair Logics Kit") {
        await this.repairLogicsKit(root);
      }
      return;
    }

    launchClaudeTerminal(root, launchers.claude.command);
  }

  async bootstrapLogics(root: string): Promise<void> {
    const scriptPath = path.join(root, "logics", "skills", "logics.py");
    const scriptArgs = ["bootstrap"];
    const beforeBootstrapStatus = await this.inspectGlobalCodexKitPublishability(root);
    if (beforeBootstrapStatus.snapshot.git.available) {
      const gitStatus = await runGitWithOutput(root, ["status", "--porcelain"]);
      if (!gitStatus.error) {
        beforeBootstrapStatus.changedPaths = parseGitStatusEntries(gitStatus.stdout).map((entry) => entry.path);
      }
    }

    if (!fs.existsSync(scriptPath)) {
      const choice = await vscode.window.showInformationMessage(
        `Bootstrap script not found at logics/skills/logics.py. Ensure the Logics kit submodule is initialized in: ${root}.`,
        "Copy Bootstrap Command"
      );
      if (choice === "Copy Bootstrap Command") {
        await vscode.env.clipboard.writeText("git submodule update --init --recursive -- logics/skills");
        void vscode.window.showInformationMessage("Bootstrap command copied to clipboard.");
      }
      return;
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
    if (result.error) {
      void vscode.window.showErrorMessage(`Bootstrap Logics failed: ${result.stderr || result.error.message}`);
      return;
    }

    const bootstrapResult = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Bootstrap Logics",
        cancellable: false
      },
      async () => {
        return runPythonWithOutput(root, scriptPath, scriptArgs);
      }
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
  }

  async maybeShowCodexOverlayHandoff(root: string, trigger: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning") {
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
    if (!inspection.exists || !inspection.isCanonical) {
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

    const worktreeStatus = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (worktreeStatus.error) {
      void vscode.window.showErrorMessage(
        `Failed to inspect repository state before updating the Logics kit: ${worktreeStatus.stderr || worktreeStatus.error.message}`
      );
      return false;
    }
    if (worktreeStatus.stdout.trim()) {
      const choice = await vscode.window.showWarningMessage(
        "Automatic Logics kit update is blocked because the repository has uncommitted changes. Commit or stash them first, or run the submodule update manually.",
        "Copy Update Command"
      );
      if (choice === "Copy Update Command") {
        await vscode.env.clipboard.writeText(updateCommand);
        void vscode.window.showInformationMessage("Logics kit update command copied to clipboard.");
      }
      return false;
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

    if (snapshot.codexOverlay.status === "missing-manager") {
      void vscode.window.showWarningMessage(
        updated
          ? "The Logics kit submodule updated, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
          : "The Logics kit is already at the current tracked submodule revision, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
      );
      return true;
    }

    const message = updated
      ? `Logics kit updated after ${trigger}. Review and commit the submodule pointer change in your repository when ready.`
      : "The Logics kit is already up to date on the tracked submodule revision.";
    const messageWithConvergence = this.appendBootstrapConvergenceNote(message, bootstrapConvergence);
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
    if ((overlay.status === "healthy" || overlay.status === "warning") && !options?.forceRepublish) {
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

  async repairLogicsKit(root: string): Promise<boolean> {
    let snapshot = await inspectLogicsEnvironment(root);
    const inspection = inspectLogicsKitSubmodule(root);
    if (snapshot.codexOverlay.status === "missing-manager") {
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

    if (snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") {
      if (bridgeRepair.writtenPaths.length > 0) {
        void vscode.window.showInformationMessage(
          `Repair Logics Kit restored Claude bridge files: ${bridgeRepair.writtenPaths.join(", ")}`
        );
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

    return this.syncCodexOverlay(root, "manual repair", { forceRepublish: true });
  }

  private async inspectGlobalCodexKitPublishability(root: string): Promise<{
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>;
    changedPaths: string[];
  }> {
    return {
      snapshot: await inspectLogicsEnvironment(root),
      changedPaths: []
    };
  }

  async ensureGlobalCodexKit(root: string): Promise<boolean> {
    const snapshot = await inspectLogicsEnvironment(root);
    if (snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") {
      return true;
    }
    if (!shouldPublishRepoKit(root, snapshot.codexOverlay)) {
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

  private async attemptBootstrapGlobalKitConvergence(root: string): Promise<BootstrapConvergenceOutcome> {
    const snapshot = await inspectLogicsEnvironment(root);
    if (snapshot.codexOverlay.status === "healthy" || snapshot.codexOverlay.status === "warning") {
      return { attempted: false, published: false, failed: false };
    }
    if (!shouldPublishRepoKit(root, snapshot.codexOverlay)) {
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

  private async maybeOfferBootstrapCommit(root: string, beforeBootstrapStatus: string[]): Promise<void> {
    const changedPaths = await this.getGitChangedPaths(root);
    const bootstrapPaths = changedPaths.filter((filePath) => isBootstrapScopedPath(filePath));
    if (bootstrapPaths.length === 0) {
      return;
    }
    const commitMessage = buildBootstrapCommitMessage(
      beforeBootstrapStatus.length > 0 ? [...beforeBootstrapStatus, ...bootstrapPaths] : bootstrapPaths
    );
    const choice = await vscode.window.showInformationMessage(
      `Bootstrap updated Logics files in this repository. Suggested commit message: ${commitMessage}`,
      "Copy Commit Message"
    );
    if (choice !== "Copy Commit Message") {
      return;
    }

    await vscode.env.clipboard.writeText(commitMessage);
    void vscode.window.showInformationMessage(`Created bootstrap commit: ${commitMessage}`);
  }

  async notifyBootstrapCompletion(
    root: string,
    globalKitOutcome?: BootstrapConvergenceOutcome
  ): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning") {
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

  private async getGitChangedPaths(root: string): Promise<string[]> {
    const result = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (result.error) {
      return [];
    }
    return parseGitStatusEntries(result.stdout).map((entry) => entry.path);
  }

  private async reconcileRepoBootstrapAfterKitUpdate(root: string): Promise<{
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

  private appendBootstrapConvergenceNote(
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
}
