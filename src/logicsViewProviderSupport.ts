import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AgentDefinition, AgentRegistrySnapshot, createEmptyAgentRegistry, loadAgentRegistry } from "./agentRegistry";
import { LogicsItem, LogicsStage } from "./logicsIndexer";
import { parseGitStatusEntries } from "./workflowSupport";
import { buildLogicsWebviewHtml } from "./logicsWebviewHtml";
import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "./logicsEnvironment";
import { areSamePath, detectDangerousGitignorePatterns, getWorkspaceRoot, inspectLogicsBootstrapState, hasMultipleWorkspaceFolders, isExistingDirectory, runGitWithOutput, updateIndicatorsOnDisk } from "./logicsProviderUtils";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { LogicsHybridAssistController } from "./logicsHybridAssistController";
import { LogicsCodexWorkflowOperations as LogicsCodexWorkflowController } from "./logicsCodexWorkflowOperations";
import { buildOnboardingHtml } from "./logicsOnboardingHtml";
import { inspectGitHubReleaseCapability } from "./releasePublishSupport";
import { inspectReleaseBranchFastForwardConsent } from "./releaseBranchConsent";
import { RuntimeLaunchersSnapshot } from "./runtimeLaunchers";
import { ReleasePublishCapability } from "./releasePublishSupport";
import { LogicsEnvironmentSnapshot } from "./logicsEnvironment";
import {
  ACTIVE_AGENT_STATE_KEY,
  ONBOARDING_LAST_VERSION_KEY,
  ROOT_OVERRIDE_STATE_KEY,
  STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX
} from "./logicsViewProviderConstants";
import { inspectKitUpdateNeed } from "./logicsKitVersionSupport";
export {
  ensureLogicsCacheDir,
  getEnvironmentOverallState,
  getEnvironmentSummaryDescription,
  shouldRecommendCheckEnvironment,
  writeEnvironmentDiagnosticReport
} from "./logicsViewProviderEnvironment";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";
type LogicsViewProviderSupportHost = {
  [key: string]: any;
};
const STATUS_OPTIONS_BY_STAGE: Record<LogicsStage, readonly string[]> = {
  request: ["Draft", "Ready", "Done", "Archived"],
  backlog: ["Draft", "Ready", "In progress", "Blocked", "Done", "Archived"],
  task: ["Draft", "Ready", "In progress", "Blocked", "Done", "Archived"],
  product: ["Proposed", "Validated", "Done", "Archived"],
  architecture: ["Proposed", "Accepted", "Validated", "Superseded", "Archived"],
  spec: ["Draft", "Ready", "In progress", "Done", "Validated", "Archived"]
};
const UNAVAILABLE_LAUNCHER_STATE: RuntimeLaunchersSnapshot = {
  codex: {
    available: false,
    title: "Unavailable",
    command: "codex"
  },
  claude: {
    available: false,
    title: "Unavailable",
    command: "claude"
  },
  hasCodex: false,
  hasClaude: false
};
const UNAVAILABLE_RELEASE_CAPABILITY: ReleasePublishCapability = {
  available: false,
  title: "Unavailable",
  reason: "Unavailable"
};
  // environment helpers moved to src/logicsViewProviderEnvironment.ts
  export function buildMissingEnvLocalQuickPickItem(this: LogicsViewProviderSupportHost,
    root: string
  ): (vscode.QuickPickItem & { action: () => Promise<void> }) | null {
    const yamlPath = path.join(root, "logics.yaml");
    if (!fs.existsSync(yamlPath)) {
      return null;
    }
    let content: string;
    try {
      content = fs.readFileSync(yamlPath, "utf-8");
    } catch {
      return null;
    }
    if (!content.includes("hybrid_assist:")) {
      return null;
    }
    // Check that at least one provider is enabled
    const hasEnabledProvider =
      /enabled:\s*true/.test(content.slice(content.indexOf("hybrid_assist:")));
    if (!hasEnabledProvider) {
      return null;
    }
    const envFiles = this.getRepositoryEnvFiles(root);
    const targetFiles = envFiles.length > 0 ? envFiles : [".env.local"];
    const missingTargets = targetFiles.filter((fileName: string) => {
      const filePath = path.join(root, fileName);
      if (!fs.existsSync(filePath)) {
        return true;
      }
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        return ["OPENAI_API_KEY", "GEMINI_API_KEY"].some(
          (key) => !new RegExp(`^\\s*${key}\\s*=`, "m").test(fileContent)
        );
      } catch {
        return true;
      }
    });
    if (missingTargets.length === 0) {
      return null;
    }
    return {
      label: "Fix now: Update environment credential placeholders",
      description:
        envFiles.length > 0
          ? `Hybrid providers are enabled, but ${missingTargets.join(", ")} is missing API key placeholders. Bootstrap will update every env file found.`
          : "Hybrid providers are enabled, but no repo env file exists yet. Bootstrap will create .env.local with API key placeholders.",
      action: async () => {
        await this.codexWorkflowController.bootstrapLogics(root);
      }
    };
  }
  export function getRepositoryEnvFiles(this: LogicsViewProviderSupportHost, root: string): string[] {
    try {
      return fs.readdirSync(root, { withFileTypes: true })
        .filter((entry: fs.Dirent) => entry.isFile() && entry.name.startsWith(".env"))
        .map((entry: fs.Dirent) => entry.name)
        .sort((left, right) => {
          const leftPriority = left === ".env.local" ? 0 : left === ".env" ? 1 : 2;
          const rightPriority = right === ".env.local" ? 0 : right === ".env" ? 1 : 2;
          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }
          return left.localeCompare(right);
        });
    } catch {
      return [];
    }
  }
  export async function buildGitignoreArtifactsQuickPickItem(this: LogicsViewProviderSupportHost,
    root: string
  ): Promise<(vscode.QuickPickItem & { action: () => Promise<void> }) | null> {
    const ARTIFACTS = [
      "logics/hybrid_assist_audit.jsonl",
      "logics/hybrid_assist_measurements.jsonl",
      "logics/mutation_audit.jsonl",
      "logics/.cache/hybrid_assist_audit.jsonl",
      "logics/.cache/hybrid_assist_measurements.jsonl"
    ];
    const result = await runGitWithOutput(root, ["ls-files", "--", ...ARTIFACTS]);
    if (!result.stdout.trim()) {
      return null;
    }
    const tracked = result.stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    if (tracked.length === 0) {
      return null;
    }
    return {
      label: `Optional: Ignore generated runtime artifacts (${tracked.length} tracked file(s))`,
      description: `${tracked.join(", ")} are generated files that should not stay committed.`,
      action: () => {
        try {
          const gitignorePath = path.join(root, ".gitignore");
          const existing = fs.existsSync(gitignorePath)
            ? fs.readFileSync(gitignorePath, "utf-8")
            : "";
          const toAdd = ARTIFACTS.filter((a) => !existing.includes(a));
          if (toAdd.length === 0) {
            void vscode.window.showInformationMessage(".gitignore already contains these entries.");
            return Promise.resolve();
          }
          const separator = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
          const section =
            "\n# Logics hybrid runtime generated artifacts\n" +
            toAdd.join("\n") +
            "\n";
          fs.writeFileSync(gitignorePath, existing + separator + section, "utf-8");
          void vscode.window.showInformationMessage(
            `.gitignore updated: added ${toAdd.length} artifact pattern(s).`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Failed to update .gitignore: ${message}`);
        }
        return Promise.resolve();
      }
    };
  }
  export function buildLogicsYamlBlocksQuickPickItem(this: LogicsViewProviderSupportHost,
    root: string
  ): (vscode.QuickPickItem & { action: () => Promise<void> }) | null {
    const yamlPath = path.join(root, "logics.yaml");
    if (!fs.existsSync(yamlPath)) {
      return null;
    }
    let content: string;
    try {
      content = fs.readFileSync(yamlPath, "utf-8");
    } catch {
      return null;
    }
    const missingBlocks: { key: string; block: string }[] = [];
    if (!content.includes("mutations:")) {
      missingBlocks.push({
        key: "mutations",
        block:
          "mutations:\n" +
          "  mode: transactional\n" +
          "  audit_log: logics/mutation_audit.jsonl\n"
      });
    }
    if (!content.includes("index:")) {
      missingBlocks.push({
        key: "index",
        block:
          "index:\n" +
          "  enabled: true\n" +
          "  path: logics/.cache/runtime_index.json\n"
      });
    }
    if (missingBlocks.length === 0) {
      return null;
    }
    const names = missingBlocks.map((b) => b.key).join(", ");
    return {
      label: `Fix now: Complete logics.yaml (${names})`,
      description: "Required runtime blocks are missing, so mutation safety or index caching is not fully configured yet.",
      action: () => {
        try {
          const separator = content.endsWith("\n") ? "" : "\n";
          const appended = missingBlocks.map((b) => b.block).join("");
          fs.writeFileSync(yamlPath, content + separator + appended, "utf-8");
          void vscode.window.showInformationMessage(
            `logics.yaml updated: added ${names} block(s).`
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Failed to update logics.yaml: ${message}`);
        }
        return Promise.resolve();
      }
    };
  }
  export function maybeShowOnboarding(this: LogicsViewProviderSupportHost, root: string): void {
    const extensionVersion =
      (this.context.extension?.packageJSON as { version?: string } | undefined)?.version ?? null;
    const normalizedRoot = path.resolve(root);
    const workspaceKey = `${ONBOARDING_LAST_VERSION_KEY}:${normalizedRoot}`;
    const lastSeen = (this.context.workspaceState.get(workspaceKey) as string | undefined) ?? null;
    if (lastSeen === extensionVersion) {
      return;
    }
    void this.context.workspaceState.update(workspaceKey, extensionVersion);
    this.openOnboardingPanel();
  }
  export function openOnboardingPanel(this: LogicsViewProviderSupportHost): void {
    if (this.onboardingPanel) {
      this.onboardingPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "logics.onboarding",
      "Logics: Getting Started",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [this.context.extensionUri]
      }
    );
    panel.webview.html = buildOnboardingHtml(panel.webview);
    panel.webview.onDidReceiveMessage(async (message: { type: string; action?: string }) => {
      if (message.type === "tool-action" && message.action) {
        panel.dispose();
        if (message.action === "open-logics-insights") {
          await this.openLogicsInsightsFromTools();
          return;
        }
        if (message.action === "about") {
          await openAbout.call(this);
          return;
        }
        await this.view?.webview.postMessage({ type: "trigger-tool-action", action: message.action });
      }
    });
    panel.onDidDispose(() => {
      if (this.onboardingPanel === panel) {
        this.onboardingPanel = undefined;
      }
    });
    this.onboardingPanel = panel;
  }
  export function buildKitVersionQuickPickItem(this: LogicsViewProviderSupportHost,
    root: string
  ): (vscode.QuickPickItem & { action: () => Promise<void> }) | null {
    const updateNeed = inspectKitUpdateNeed(root);
    if (!updateNeed) {
      return null;
    }
    if (updateNeed.kind === "too-new") {
      return {
        label: `Warn: Logics Kit is newer than the tested maximum v${updateNeed.maximumVersion}`,
        description: `Local kit v${updateNeed.currentVersion} exceeds the tested upper bound. Review compatibility before relying on the kit.`,
        action: async () => {
          await this.checkEnvironmentFromCommand();
        }
      };
    }
    return {
      label: `Run: Update Logics Kit (local kit is v${updateNeed.currentVersion}, minimum recommended v${updateNeed.minimumVersion})`,
      description: "Older kit missing environment convergence, bootstrap credential scaffolding, and current repair support.",
      action: async () => {
        await this.codexWorkflowController.updateLogicsKit(root, "environment diagnostics");
      }
    };
  }
  export async function checkHybridRuntimeFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.checkHybridRuntimeFromTools();
  }
  export async function commitAllChangesFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.commitAllChangesFromTools();
  }
  export async function suggestNextStepFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.suggestNextStepFromTools();
  }
  export async function triageWorkflowDocFromTools(this: LogicsViewProviderSupportHost, preferredId?: string): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools(preferredId);
  }
  export async function assessDiffRiskFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }
  export async function summarizeValidationFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.summarizeValidationFromTools();
  }
  export async function summarizeChangelogFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.summarizeChangelogFromTools();
  }
  export async function prepareReleaseFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.prepareReleaseFromTools();
  }
  export async function publishReleaseFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.publishReleaseFromTools();
  }
  export async function buildValidationChecklistFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }
  export async function reviewDocConsistencyFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }
  export async function openHybridInsightsFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }
  export async function openLogicsInsightsFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.logicsCorpusInsightsController.openLogicsInsightsFromTools();
  }
  export async function openAbout(this: LogicsViewProviderSupportHost): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(PROJECT_GITHUB_URL));
  }
  export async function updateLogicsKitFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.updateLogicsKit(root, "tools menu");
  }
  export async function syncCodexOverlayFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.syncCodexOverlay(root, "tools menu");
  }
  export async function repairLogicsKitFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.repairLogicsKit(root);
  }
  export async function markItemDone(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Done", "100%");
  }
  export async function markItemObsolete(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Obsolete", "100%");
  }
  export function getValidStatusesForItem(this: LogicsViewProviderSupportHost, item: LogicsItem): string[] {
    return [...(STATUS_OPTIONS_BY_STAGE[item.stage] || [])];
  }
  export async function changeItemStatus(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    const item = this.items.find((entry: LogicsItem) => entry.id === id);
    if (!item) {
      return;
    }
    const statuses: string[] = this.getValidStatusesForItem(item);
    if (statuses.length === 0) {
      void vscode.window.showInformationMessage(`No selectable statuses are defined for ${item.id}.`);
      return;
    }
    const currentStatus = String(item.indicators?.Status || "").trim();
    const pickItems: vscode.QuickPickItem[] = statuses.map((status: string): vscode.QuickPickItem => ({
        label: status,
        description: status === currentStatus ? "Current status" : undefined,
        picked: status === currentStatus
      }));
    const pick = (await vscode.window.showQuickPick(
      pickItems,
      {
        placeHolder: `Change status for ${item.id}`,
        title: item.title ? `${item.title}` : undefined
      }
    )) as vscode.QuickPickItem | undefined;
    if (!pick) {
      return;
    }
    if (pick.label === currentStatus) {
      void vscode.window.showInformationMessage(`Status for ${item.id} is already ${pick.label}.`);
      return;
    }
    const updated = updateIndicatorsOnDisk(item.path, {
      Status: pick.label
    });
    if (!updated) {
      void vscode.window.showInformationMessage(`Item already marked as ${pick.label.toLowerCase()}.`);
      return;
    }
    void vscode.window.showInformationMessage(`Updated ${item.id} status to ${pick.label}.`);
    await this.refresh(item.id);
  }
  export async function updateItemLifecycle(this: LogicsViewProviderSupportHost, id: string, status: string, progress: string): Promise<void> {
    const item = this.items.find((entry: LogicsItem) => entry.id === id);
    if (!item) {
      return;
    }
    const updated = updateIndicatorsOnDisk(item.path, {
      Status: status,
      Progress: progress
    });
    if (!updated) {
      void vscode.window.showInformationMessage(`Item already marked as ${status.toLowerCase()}.`);
      return;
    }
    void vscode.window.showInformationMessage(`Marked ${item.id} as ${status.toLowerCase()}.`);
    await this.refresh(item.id);
  }
  export async function changeProjectRoot(this: LogicsViewProviderSupportHost): Promise<void> {
    const currentRoot = this.resolveProjectRoot().root;
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Use as Project Root",
      defaultUri: currentRoot ? vscode.Uri.file(currentRoot) : undefined
    });
    if (!picked || picked.length === 0) {
      return;
    }
    const nextRoot = picked[0].fsPath;
    if (!isExistingDirectory(nextRoot)) {
      void vscode.window.showErrorMessage("Selected path is not a folder.");
      return;
    }
    const workspaceRoot = getWorkspaceRoot();
    if (workspaceRoot && areSamePath(nextRoot, workspaceRoot)) {
      this.projectRootOverride = null;
      this.invalidRootNotice = undefined;
      await this.context.workspaceState.update(ROOT_OVERRIDE_STATE_KEY, undefined);
      void vscode.window.showInformationMessage("Selected folder is already the workspace root.");
      this.onProjectRootChanged();
      await this.refresh();
      return;
    }
    this.projectRootOverride = nextRoot;
    this.invalidRootNotice = undefined;
    await this.context.workspaceState.update(ROOT_OVERRIDE_STATE_KEY, nextRoot);
    void vscode.window.showInformationMessage(`Logics project root set to: ${nextRoot}`);
    this.onProjectRootChanged();
    await this.refresh();
  }
  export async function resetProjectRoot(this: LogicsViewProviderSupportHost): Promise<void> {
    if (!this.projectRootOverride) {
      void vscode.window.showInformationMessage("Already using the workspace root.");
      return;
    }
    this.projectRootOverride = null;
    this.invalidRootNotice = undefined;
    await this.context.workspaceState.update(ROOT_OVERRIDE_STATE_KEY, undefined);
    void vscode.window.showInformationMessage("Switched back to workspace root.");
    this.onProjectRootChanged();
    await this.refresh();
  }
  export function canResetProjectRoot(this: LogicsViewProviderSupportHost): boolean {
    if (!this.projectRootOverride) {
      return false;
    }
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return true;
    }
    return !areSamePath(this.projectRootOverride, workspaceRoot);
  }
  export function resolveProjectRoot(this: LogicsViewProviderSupportHost): {
    root: string | null;
    invalidOverridePath?: string;
  } {
    const workspaceRoot = getWorkspaceRoot();
    if (!this.projectRootOverride) {
      return { root: workspaceRoot };
    }
    if (isExistingDirectory(this.projectRootOverride)) {
      return { root: this.projectRootOverride };
    }
    return {
      root: workspaceRoot,
      invalidOverridePath: this.projectRootOverride
    };
  }
  export function notifyInvalidRootOverride(this: LogicsViewProviderSupportHost, invalidOverridePath: string | undefined, hasFallbackRoot: boolean): void {
    if (!invalidOverridePath) {
      this.invalidRootNotice = undefined;
      return;
    }
    if (this.invalidRootNotice === invalidOverridePath) {
      return;
    }
    this.invalidRootNotice = invalidOverridePath;
    const suffix = hasFallbackRoot ? " Falling back to workspace root." : "";
    void vscode.window.showWarningMessage(`Configured project root not found: ${invalidOverridePath}.${suffix}`);
  }
  export async function getActionRoot(this: LogicsViewProviderSupportHost): Promise<string | null> {
    const { root, invalidOverridePath } = this.resolveProjectRoot();
    this.notifyInvalidRootOverride(invalidOverridePath, Boolean(root));
    if (!root) {
      void vscode.window.showErrorMessage(
        invalidOverridePath
          ? `Configured project root not found: ${invalidOverridePath}. Use Tools > Change Project Root.`
          : hasMultipleWorkspaceFolders()
            ? "Multiple workspace folders detected. Use Tools > Change Project Root to choose the active root."
            : "No project root found. Open a workspace or use Tools > Change Project Root."
      );
      return null;
    }
    return root;
  }
  export async function clearAgentRegistry(this: LogicsViewProviderSupportHost): Promise<void> {
    this.agentRegistry = createEmptyAgentRegistry();
    if (this.activeAgentId) {
      await this.setActiveAgent(null);
    }
  }
  export async function refreshAgents(this: LogicsViewProviderSupportHost, mode: "silent" | "notify", root: string): Promise<void> {
    const snapshot = loadAgentRegistry(root);
    this.agentRegistry = snapshot;
    const activeStillExists = this.activeAgentId
      ? snapshot.agents.some((agent: AgentDefinition) => agent.id === this.activeAgentId)
      : false;
    if (this.activeAgentId && !activeStillExists) {
      await this.setActiveAgent(null);
    }
    if (mode === "notify") {
      this.writeAgentScanOutput(snapshot, root, true);
      if (snapshot.issues.length > 0) {
        void vscode.window.showWarningMessage(
          `Logics agents refreshed: ${snapshot.agents.length} loaded, ${snapshot.issues.length} issue(s).`
        );
      } else {
        void vscode.window.showInformationMessage(`Logics agents refreshed: ${snapshot.agents.length} loaded.`);
      }
      return;
    }
    if (snapshot.issues.length > 0) {
      this.writeAgentScanOutput(snapshot, root, false);
    }
  }
  export function writeAgentScanOutput(this: LogicsViewProviderSupportHost, snapshot: AgentRegistrySnapshot, root: string, reveal: boolean): void {
    this.agentsOutput.clear();
    this.agentsOutput.appendLine(`Logics agent scan @ ${new Date().toISOString()}`);
    this.agentsOutput.appendLine(`Root: ${root}`);
    this.agentsOutput.appendLine(`Scanned files: ${snapshot.scannedFiles}`);
    this.agentsOutput.appendLine(`Loaded agents: ${snapshot.agents.length}`);
    if (!snapshot.issues.length) {
      this.agentsOutput.appendLine("No validation issues.");
      if (reveal) {
        this.agentsOutput.show(true);
      }
      return;
    }
    this.agentsOutput.appendLine(`Validation issues: ${snapshot.issues.length}`);
    for (const issue of snapshot.issues) {
      this.agentsOutput.appendLine(`[ERROR] ${issue.sourcePath} -> ${issue.message}`);
    }
    if (reveal) {
      this.agentsOutput.show(true);
    }
  }
  export async function setActiveAgent(this: LogicsViewProviderSupportHost, agentId: string | null): Promise<void> {
    this.activeAgentId = agentId;
    if (agentId) {
      await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, agentId);
      return;
    }
    await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, undefined);
  }
  export function findRequestAuthoringAgent(this: LogicsViewProviderSupportHost): AgentDefinition | undefined {
    return this.agentRegistry.agents.find((agent: AgentDefinition) => agent.id === "$logics-flow-manager");
  }
  export async function injectPromptIntoCodexChat(this: LogicsViewProviderSupportHost,
    prompt: string,
    options?: {
      codexCopiedMessage?: string;
      fallbackCopiedMessage?: string;
      preferNewThread?: boolean;
    }
  ): Promise<void> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      return;
    }
    const codexCopiedMessage =
      options?.codexCopiedMessage ||
      (options?.preferNewThread
        ? "Prompt copied to clipboard. Open a new assistant session, then paste it."
        : "Prompt copied to clipboard for your assistant. Paste it into your assistant session.");
    const fallbackCopiedMessage = options?.fallbackCopiedMessage || "Could not copy the prompt to the clipboard.";
    try {
      await vscode.env.clipboard.writeText(normalizedPrompt);
      void vscode.window.showInformationMessage(codexCopiedMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showWarningMessage(`${fallbackCopiedMessage} (${message})`);
    }
  }
  export async function injectAgentPromptIntoCodexChat(this: LogicsViewProviderSupportHost, agent: AgentDefinition): Promise<void> {
    await this.injectPromptIntoCodexChat(agent.defaultPrompt, {
      codexCopiedMessage: "Agent prompt copied to clipboard for your assistant. Paste it into your assistant session.",
      fallbackCopiedMessage: "Could not copy the agent prompt to the clipboard."
    });
  }
  export async function injectPromptFromWebview(this: LogicsViewProviderSupportHost,
    prompt: string,
    options?: {
      codexCopiedMessage?: string;
      fallbackCopiedMessage?: string;
      preferNewThread?: boolean;
    }
  ): Promise<void> {
    await this.injectPromptIntoCodexChat(prompt, {
      codexCopiedMessage: options?.codexCopiedMessage ?? (options?.preferNewThread
        ? "Context pack copied to clipboard. Open a new assistant session, then paste it."
        : "Context pack copied to clipboard for your assistant. Paste it into your assistant session."),
      fallbackCopiedMessage: options?.fallbackCopiedMessage ?? "Could not copy the context pack to the clipboard.",
      preferNewThread: options?.preferNewThread
    });
  }
  export function getActiveAgentPayload(this: LogicsViewProviderSupportHost):
    | {
        id: string;
        displayName: string;
        preferredContextProfile: "tiny" | "normal" | "deep";
        allowedDocStages: string[];
        blockedDocStages: string[];
        responseStyle: "concise" | "balanced" | "detailed";
      }
    | undefined {
    if (!this.activeAgentId) {
      return undefined;
    }
    const agent = this.agentRegistry.agents.find((entry: AgentDefinition) => entry.id === this.activeAgentId);
    if (!agent) {
      return undefined;
    }
    return {
      id: agent.id,
      displayName: agent.displayName,
      preferredContextProfile: agent.preferredContextProfile,
      allowedDocStages: [...agent.allowedDocStages],
      blockedDocStages: [...agent.blockedDocStages],
      responseStyle: agent.responseStyle
    };
  }
  export async function getGitChangedPaths(this: LogicsViewProviderSupportHost, root: string): Promise<string[]> {
    const result = await runGitWithOutput(root, ["status", "--short"]);
    if (result.error) {
      return [];
    }
    return parseGitStatusEntries(result.stdout)
      .map((entry) => entry.path)
      .filter((entry: string, index: number, collection: string[]) => entry.length > 0 && collection.indexOf(entry) === index)
      .slice(0, 40);
  }
  export function getReadPreviewPanel(this: LogicsViewProviderSupportHost): vscode.WebviewPanel {
    if (this.readPreviewPanel) {
      return this.readPreviewPanel;
    }
    const mermaidRoot = vscode.Uri.file(path.join(this.context.extensionPath, "dist", "vendor"));
    const panel = vscode.window.createWebviewPanel(
      "logics.readPreview",
      "Read: Logics item",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri, mermaidRoot]
      }
    );
    panel.onDidDispose(() => {
      if (this.readPreviewPanel === panel) {
        this.readPreviewPanel = undefined;
      }
    });
    panel.webview.onDidReceiveMessage(async (message) => {
      if (!message || typeof message !== "object") {
        return;
      }
      if (message.type === "open-linked-doc" && typeof message.target === "string" && message.target.trim()) {
        await this.documentController.openLinkedItem(message.target);
        return;
      }
      if (message.type === "open-external-link" && typeof message.target === "string" && message.target.trim()) {
        try {
          await vscode.env.openExternal(vscode.Uri.parse(message.target));
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          void vscode.window.showWarningMessage(`Could not open external link: ${reason}`);
        }
      }
    });
    this.readPreviewPanel = panel;
    return panel;
  }
  export async function maybeOfferBootstrap(this: LogicsViewProviderSupportHost, root: string): Promise<boolean> {
    return this.codexWorkflowController.maybeOfferBootstrap(root);
  }
  export async function maybeOfferStartupKitUpdate(this: LogicsViewProviderSupportHost,
    root: string,
    bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null
  ): Promise<boolean> {
    if (bootstrapState?.status !== "canonical") {
      await this.clearStartupKitUpdatePromptState(root);
      return false;
    }
    const updateNeed = inspectKitUpdateNeed(root);
    if (!updateNeed) {
      await this.clearStartupKitUpdatePromptState(root);
      return false;
    }
    const promptKey = this.getStartupKitUpdatePromptStateKey(root);
    const lastPromptSignature = (this.context.globalState.get(promptKey) as string | undefined) ?? null;
    if (lastPromptSignature === updateNeed.signature) {
      return false;
    }
    await this.context.globalState.update(promptKey, updateNeed.signature);
    if (updateNeed.kind === "too-new") {
      const choice = await vscode.window.showWarningMessage(
        `Newer Logics kit detected in this repository (v${updateNeed.currentVersion}). The plugin has only been tested up to v${updateNeed.maximumVersion}. Check compatibility before proceeding.`,
        "Check Environment",
        "Not now"
      );
      if (choice === "Check Environment") {
        await this.checkEnvironmentFromCommand();
        return true;
      }
      return true;
    }
    const choice = await vscode.window.showInformationMessage(
      `Older Logics kit detected in this repository (v${updateNeed.currentVersion}). Update now to restore migration, repair, and environment convergence support.`,
      "Update Logics Kit",
      "Check Environment",
      "Not now"
    );
    if (choice === "Update Logics Kit") {
      await this.codexWorkflowController.updateLogicsKit(root, "startup kit remediation");
      return true;
    }
    if (choice === "Check Environment") {
      await this.checkEnvironmentFromCommand();
      return true;
    }
    return true;
  }
  export async function maybeOfferCodexStartupRemediation(this: LogicsViewProviderSupportHost, root: string): Promise<void> {
    await this.codexWorkflowController.maybeOfferCodexStartupRemediation(root);
  }
  export async function maybeShowCodexOverlayHandoff(this: LogicsViewProviderSupportHost, root: string, trigger: string): Promise<void> {
    await this.codexWorkflowController.maybeShowCodexOverlayHandoff(root, trigger);
  }
  export async function bootstrapLogics(this: LogicsViewProviderSupportHost, root: string): Promise<void> {
    await this.codexWorkflowController.bootstrapLogics(root);
  }
  export async function notifyBootstrapCompletion(this: LogicsViewProviderSupportHost,
    root: string,
    globalKitOutcome?: {
      attempted: boolean;
      published: boolean;
      failed: boolean;
      failureMessage?: string;
    }
  ): Promise<void> {
    await this.codexWorkflowController.notifyBootstrapCompletion(root, globalKitOutcome);
  }
  export async function pickItem(this: LogicsViewProviderSupportHost, items: LogicsItem[], placeHolder: string): Promise<LogicsItem | undefined> {
    if (!items.length) {
      void vscode.window.showInformationMessage("No Logics items found.");
      return undefined;
    }
    const pick = await vscode.window.showQuickPick(
      items.map((item) => ({
        label: `${item.title}`,
        description: `${item.stage} • ${item.id}`,
        item
      })),
      { placeHolder }
    );
    return pick?.item;
  }
  export function postData(this: LogicsViewProviderSupportHost, payload: {
    items?: LogicsItem[];
    root?: string;
    error?: string;
    selectedId?: string;
    canBootstrapLogics?: boolean;
    bootstrapLogicsTitle?: string;
    canResetProjectRoot?: boolean;
    canLaunchCodex?: boolean;
    launchCodexTitle?: string;
    canLaunchClaude?: boolean;
    launchClaudeTitle?: string;
    canRepairLogicsKit?: boolean;
    repairLogicsKitTitle?: string;
    canPublishRelease?: boolean;
    publishReleaseTitle?: string;
    shouldRecommendCheckEnvironment?: boolean;
    activeAgentId?: string;
    changedPaths?: string[];
    activeAgent?: {
      id: string;
      displayName: string;
      preferredContextProfile: "tiny" | "normal" | "deep";
      allowedDocStages: string[];
      blockedDocStages: string[];
      responseStyle: "concise" | "balanced" | "detailed";
    };
  }): void {
    if (!this.view) {
      return;
    }
    this.view.webview.postMessage({
      type: "data",
      payload
    });
  }
  export function getStartupKitUpdatePromptStateKey(this: LogicsViewProviderSupportHost, root: string): string {
    return `${STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX}:${path.resolve(root)}`;
  }
  export async function clearStartupKitUpdatePromptState(this: LogicsViewProviderSupportHost, root: string): Promise<void> {
    await this.context.globalState.update(this.getStartupKitUpdatePromptStateKey(root), undefined);
  }
  export async function openItem(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.openItem(id);
  }
  export async function readItem(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.readItem(id);
  }
  export async function promoteItem(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.promoteItem(id);
  }
  export async function addReference(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.addReference(id);
  }
  export async function addUsedBy(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.addUsedBy(id);
  }
  export async function renameItem(this: LogicsViewProviderSupportHost, id: string): Promise<void> {
    await this.documentController.renameItem(id);
  }
export function getHtmlForWebview(this: LogicsViewProviderSupportHost, webview: vscode.Webview): string {
    return buildLogicsWebviewHtml(this.context.extensionUri, webview);
  }
export async function checkEnvironmentFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.checkEnvironmentFromTools();
  }
export async function refreshAgentsFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      return;
    }
    await this.refreshAgents("notify", root);
  }
export async function openHybridInsightsFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }
export async function openLogicsInsightsFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.logicsCorpusInsightsController.openLogicsInsightsFromTools();
  }
export function openOnboardingFromCommand(this: LogicsViewProviderSupportHost): void {
    this.openOnboardingPanel();
  }
export async function triageWorkflowDocFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools();
  }
export async function assessDiffRiskFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }
export async function buildValidationChecklistFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }
export async function reviewDocConsistencyFromCommand(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }
export async function createRequest(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.documentController.createRequest();
  }
export async function startGuidedRequestFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.documentController.startGuidedRequestFromTools();
  }
export async function launchCodexFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchCodexFromTools(root);
  }
export async function launchClaudeFromTools(this: LogicsViewProviderSupportHost): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchClaudeFromTools(root);
  }
export async function createItem(this: LogicsViewProviderSupportHost, kind: "request" | "backlog" | "task"): Promise<void> {
    await this.documentController.createItem(kind);
  }
export async function createCompanionDoc(this: LogicsViewProviderSupportHost,
    sourceId: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDoc(sourceId, preferredKind);
  }
export async function createCompanionDocFromPalette(this: LogicsViewProviderSupportHost,
    preferredSourceId?: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDocFromPalette(preferredSourceId, preferredKind);
  }
export async function fixDocs(this: LogicsViewProviderSupportHost): Promise<void> {
    await this.documentController.fixDocs();
  }
