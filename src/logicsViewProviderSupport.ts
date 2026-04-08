import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AgentDefinition, AgentRegistrySnapshot, createEmptyAgentRegistry, loadAgentRegistry } from "./agentRegistry";
import { LogicsItem } from "./logicsIndexer";
import { parseGitStatusEntries } from "./workflowSupport";
import { buildLogicsWebviewHtml } from "./logicsWebviewHtml";
import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "./logicsEnvironment";
import { areSamePath, detectDangerousGitignorePatterns, getWorkspaceRoot, inspectLogicsBootstrapState, hasMultipleWorkspaceFolders, isExistingDirectory, runGitWithOutput, updateIndicatorsOnDisk } from "./logicsProviderUtils";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { LogicsHybridAssistController } from "./logicsHybridAssistController";
import { LogicsCodexWorkflowController } from "./logicsCodexWorkflowController";
import { buildOnboardingHtml } from "./logicsOnboardingHtml";
import { inspectGitHubReleaseCapability } from "./releasePublishSupport";
import { inspectReleaseBranchFastForwardConsent } from "./releaseBranchConsent";
import { inspectRuntimeLaunchers, RuntimeLaunchersSnapshot } from "./runtimeLaunchers";
import { ReleasePublishCapability } from "./releasePublishSupport";
import { LogicsEnvironmentSnapshot } from "./logicsEnvironment";
const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const ONBOARDING_LAST_VERSION_KEY = "logics.onboardingLastVersion";
const STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX = "logics.startupKitUpdatePrompt";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";
const MIN_LOGICS_KIT_MAJOR = 1;
const MIN_LOGICS_KIT_MINOR = 7;
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
  }
};
const UNAVAILABLE_RELEASE_CAPABILITY: ReleasePublishCapability = {
  available: false,
  title: "Unavailable",
  reason: "Unavailable"
};
  export async function shouldRecommendCheckEnvironment(this: any, root: string, snapshot: LogicsEnvironmentSnapshot | null, bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null): Promise<boolean> {
    if (bootstrapState?.canBootstrap) {
      return true;
    }
    if (!snapshot) {
      return true;
    }
    if (snapshot.repositoryState !== "ready" || snapshot.missingWorkflowDirs.length > 0) {
      return true;
    }
    if (!snapshot.git.available || !snapshot.python.available) {
      return true;
    }
    if (snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning") {
      return true;
    }
    if (snapshot.claudeGlobalKit?.status && snapshot.claudeGlobalKit.status !== "healthy") {
      return true;
    }
    if (!snapshot.hybridRuntime || snapshot.hybridRuntime.state !== "ready" || !snapshot.hybridRuntime.claudeBridgeAvailable) {
      return true;
    }
    if (await this.hybridAssistController.buildProviderRemediationQuickPickItem(root)) {
      return true;
    }
    if (this.buildLogicsYamlBlocksQuickPickItem(root) || this.buildMissingEnvLocalQuickPickItem(root)) {
      return true;
    }
    return false;
  }
  export function getEnvironmentOverallState(this: any, snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>, hybridRuntime: NonNullable<Awaited<ReturnType<typeof inspectLogicsEnvironment>>["hybridRuntime"]>, actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>): "Blocked" | "Degraded" | "Healthy" {
    const hasBlockingIssue =
      !snapshot.root ||
      snapshot.repositoryState === "missing-logics" ||
      snapshot.repositoryState === "missing-kit" ||
      snapshot.repositoryState === "missing-flow-manager" ||
      !snapshot.git.available ||
      !snapshot.python.available ||
      hybridRuntime.state === "unavailable";
    if (hasBlockingIssue) {
      return "Blocked";
    }
    const hasDegradedIssue =
      snapshot.missingWorkflowDirs.length > 0 ||
      snapshot.codexOverlay.status !== "healthy" ||
      snapshot.claudeGlobalKit?.status === "stale" ||
      snapshot.claudeGlobalKit?.status === "missing-overlay" ||
      snapshot.claudeGlobalKit?.status === "missing-manager" ||
      hybridRuntime.state === "degraded" ||
      !hybridRuntime.claudeBridgeAvailable ||
      actions.length > 0;
    return hasDegradedIssue ? "Degraded" : "Healthy";
  }
  export function getEnvironmentSummaryDescription(this: any, snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>, hybridRuntime: NonNullable<Awaited<ReturnType<typeof inspectLogicsEnvironment>>["hybridRuntime"]>, actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>): string {
    const blockedCount = [
      !snapshot.root,
      snapshot.repositoryState === "missing-logics",
      snapshot.repositoryState === "missing-kit",
      snapshot.repositoryState === "missing-flow-manager",
      !snapshot.git.available,
      !snapshot.python.available,
      hybridRuntime.state === "unavailable"
    ].filter(Boolean).length;
    const degradedCount = [
      snapshot.missingWorkflowDirs.length > 0,
      snapshot.codexOverlay.status !== "healthy",
      snapshot.claudeGlobalKit?.status === "stale" ||
        snapshot.claudeGlobalKit?.status === "missing-overlay" ||
        snapshot.claudeGlobalKit?.status === "missing-manager",
      hybridRuntime.state === "degraded",
      !hybridRuntime.claudeBridgeAvailable
    ].filter(Boolean).length;
    if (blockedCount === 0 && degradedCount === 0 && actions.length === 0) {
      return "Environment healthy - no action required.";
    }
    const parts = [
      blockedCount > 0 ? `${blockedCount} blocking issue(s)` : "",
      degradedCount > 0 ? `${degradedCount} degraded state(s)` : "",
      actions.length > 0 ? `${actions.length} recommended action(s)` : ""
    ].filter((value) => value.length > 0);
    return `${parts.join(", ")}. ${actions.length > 0 ? "Select a fix below or open the detailed report." : "Review current status below."}`;
  }
  export function writeEnvironmentDiagnosticReport(this: any, root: string | null, snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>, recommendedActions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>, statusItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>, detailItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>): void {
    this.environmentOutput.clear();
    this.environmentOutput.appendLine(`Logics environment diagnostics @ ${new Date().toISOString()}`);
    this.environmentOutput.appendLine(`Root: ${root ?? "(none selected)"}`);
    this.environmentOutput.appendLine("");
    this.environmentOutput.appendLine("[Summary]");
    for (const item of statusItems.slice(0, 1)) {
      this.environmentOutput.appendLine(`- ${item.label}`);
      if (item.description) {
        this.environmentOutput.appendLine(`  ${item.description}`);
      }
    }
    if (recommendedActions.length > 0) {
      this.environmentOutput.appendLine("");
      this.environmentOutput.appendLine("[Recommended actions]");
      for (const item of recommendedActions) {
        this.environmentOutput.appendLine(`- ${item.label}`);
        if (item.description) {
          this.environmentOutput.appendLine(`  ${item.description}`);
        }
      }
    }
    this.environmentOutput.appendLine("");
    this.environmentOutput.appendLine("[Current status]");
    for (const item of statusItems.slice(1)) {
      this.environmentOutput.appendLine(`- ${item.label}`);
      if (item.description) {
        this.environmentOutput.appendLine(`  ${item.description}`);
      }
    }
    this.environmentOutput.appendLine("");
    this.environmentOutput.appendLine("[Technical details]");
    for (const item of detailItems.filter((entry) => entry.label !== "Open detailed diagnostic report")) {
      this.environmentOutput.appendLine(`- ${item.label}`);
      if (item.description) {
        this.environmentOutput.appendLine(`  ${item.description}`);
      }
    }
    this.environmentOutput.appendLine("");
    this.environmentOutput.appendLine("[Snapshot]");
    this.environmentOutput.appendLine(JSON.stringify(snapshot, null, 2));
    this.environmentOutput.show(true);
  }
  export function ensureLogicsCacheDir(this: any, root: string): void {
    const cacheDir = path.join(root, "logics", ".cache");
    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch {
        // non-blocking — runtime will surface errors if it can't write there
      }
    }
  }
  export function buildMissingEnvLocalQuickPickItem(this: any,
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
  export function getRepositoryEnvFiles(this: any, root: string): string[] {
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
  export async function buildGitignoreArtifactsQuickPickItem(this: any,
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
  export function buildLogicsYamlBlocksQuickPickItem(this: any,
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
  export function maybeShowOnboarding(this: any, root: string): void {
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
  export function openOnboardingPanel(this: any): void {
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
  export function buildKitVersionQuickPickItem(this: any,
    root: string
  ): (vscode.QuickPickItem & { action: () => Promise<void> }) | null {
    const updateNeed = this.inspectKitUpdateNeed(root);
    if (!updateNeed) {
      return null;
    }
    return {
      label: `Run: Update Logics Kit (local kit is v${updateNeed.currentVersion}, minimum recommended v${updateNeed.minimumVersion})`,
      description: "Older kit missing environment convergence, bootstrap credential scaffolding, and current repair support.",
      action: async () => {
        await this.codexWorkflowController.updateLogicsKit(root, "environment diagnostics");
      }
    };
  }
  export function inspectKitUpdateNeed(this: any, root: string): { currentVersion: string; minimumVersion: string; signature: string } | null {
    const versionPath = path.join(root, "logics", "skills", "VERSION");
    if (!fs.existsSync(versionPath)) {
      return null;
    }
    let raw: string;
    try {
      raw = fs.readFileSync(versionPath, "utf-8").trim();
    } catch {
      return null;
    }
    const parts = raw.split(".").map(Number);
    if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [major, minor] = parts;
    const isTooOld =
      major < MIN_LOGICS_KIT_MAJOR || (major === MIN_LOGICS_KIT_MAJOR && minor < MIN_LOGICS_KIT_MINOR);
    if (!isTooOld) {
      return null;
    }
    const minimumVersion = `${MIN_LOGICS_KIT_MAJOR}.${MIN_LOGICS_KIT_MINOR}.x`;
    return {
      currentVersion: raw,
      minimumVersion,
      signature: `kit-too-old:${raw}->${minimumVersion}`
    };
  }
  export async function checkHybridRuntimeFromTools(this: any): Promise<void> {
    await this.hybridAssistController.checkHybridRuntimeFromTools();
  }
  export async function commitAllChangesFromTools(this: any): Promise<void> {
    await this.hybridAssistController.commitAllChangesFromTools();
  }
  export async function suggestNextStepFromTools(this: any): Promise<void> {
    await this.hybridAssistController.suggestNextStepFromTools();
  }
  export async function triageWorkflowDocFromTools(this: any, preferredId?: string): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools(preferredId);
  }
  export async function assessDiffRiskFromTools(this: any): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }
  export async function summarizeValidationFromTools(this: any): Promise<void> {
    await this.hybridAssistController.summarizeValidationFromTools();
  }
  export async function summarizeChangelogFromTools(this: any): Promise<void> {
    await this.hybridAssistController.summarizeChangelogFromTools();
  }
  export async function prepareReleaseFromTools(this: any): Promise<void> {
    await this.hybridAssistController.prepareReleaseFromTools();
  }
  export async function publishReleaseFromTools(this: any): Promise<void> {
    await this.hybridAssistController.publishReleaseFromTools();
  }
  export async function buildValidationChecklistFromTools(this: any): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }
  export async function reviewDocConsistencyFromTools(this: any): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }
  export async function openHybridInsightsFromTools(this: any): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }
  export async function openAbout(this: any): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(PROJECT_GITHUB_URL));
  }
  export async function updateLogicsKitFromTools(this: any): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.updateLogicsKit(root, "tools menu");
  }
  export async function syncCodexOverlayFromTools(this: any): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.syncCodexOverlay(root, "tools menu");
  }
  export async function repairLogicsKitFromTools(this: any): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.repairLogicsKit(root);
  }
  export async function markItemDone(this: any, id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Done", "100%");
  }
  export async function markItemObsolete(this: any, id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Obsolete", "100%");
  }
  export async function updateItemLifecycle(this: any, id: string, status: string, progress: string): Promise<void> {
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
  export async function changeProjectRoot(this: any): Promise<void> {
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
  export async function resetProjectRoot(this: any): Promise<void> {
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
  export function canResetProjectRoot(this: any): boolean {
    if (!this.projectRootOverride) {
      return false;
    }
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return true;
    }
    return !areSamePath(this.projectRootOverride, workspaceRoot);
  }
  export function resolveProjectRoot(this: any): {
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
  export function notifyInvalidRootOverride(this: any, invalidOverridePath: string | undefined, hasFallbackRoot: boolean): void {
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
  export async function getActionRoot(this: any): Promise<string | null> {
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
  export async function clearAgentRegistry(this: any): Promise<void> {
    this.agentRegistry = createEmptyAgentRegistry();
    if (this.activeAgentId) {
      await this.setActiveAgent(null);
    }
  }
  export async function refreshAgents(this: any, mode: "silent" | "notify", root: string): Promise<void> {
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
  export function writeAgentScanOutput(this: any, snapshot: AgentRegistrySnapshot, root: string, reveal: boolean): void {
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
  export async function setActiveAgent(this: any, agentId: string | null): Promise<void> {
    this.activeAgentId = agentId;
    if (agentId) {
      await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, agentId);
      return;
    }
    await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, undefined);
  }
  export function findRequestAuthoringAgent(this: any): AgentDefinition | undefined {
    return this.agentRegistry.agents.find((agent: AgentDefinition) => agent.id === "$logics-flow-manager");
  }
  export async function injectPromptIntoCodexChat(this: any,
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
  export async function injectAgentPromptIntoCodexChat(this: any, agent: AgentDefinition): Promise<void> {
    await this.injectPromptIntoCodexChat(agent.defaultPrompt, {
      codexCopiedMessage: "Agent prompt copied to clipboard for your assistant. Paste it into your assistant session.",
      fallbackCopiedMessage: "Could not copy the agent prompt to the clipboard."
    });
  }
  export async function injectPromptFromWebview(this: any,
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
  export function getActiveAgentPayload(this: any):
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
  export async function getGitChangedPaths(this: any, root: string): Promise<string[]> {
    const result = await runGitWithOutput(root, ["status", "--short"]);
    if (result.error) {
      return [];
    }
    return parseGitStatusEntries(result.stdout)
      .map((entry) => entry.path)
      .filter((entry: string, index: number, collection: string[]) => entry.length > 0 && collection.indexOf(entry) === index)
      .slice(0, 40);
  }
  export function getReadPreviewPanel(this: any): vscode.WebviewPanel {
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
    this.readPreviewPanel = panel;
    return panel;
  }
  export async function maybeOfferBootstrap(this: any, root: string): Promise<boolean> {
    return this.codexWorkflowController.maybeOfferBootstrap(root);
  }
  export async function maybeOfferStartupKitUpdate(this: any,
    root: string,
    bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null
  ): Promise<boolean> {
    if (bootstrapState?.status !== "canonical") {
      await this.clearStartupKitUpdatePromptState(root);
      return false;
    }
    const updateNeed = this.inspectKitUpdateNeed(root);
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
  export async function maybeOfferCodexStartupRemediation(this: any, root: string): Promise<void> {
    await this.codexWorkflowController.maybeOfferCodexStartupRemediation(root);
  }
  export async function maybeShowCodexOverlayHandoff(this: any, root: string, trigger: string): Promise<void> {
    await this.codexWorkflowController.maybeShowCodexOverlayHandoff(root, trigger);
  }
  export async function bootstrapLogics(this: any, root: string): Promise<void> {
    await this.codexWorkflowController.bootstrapLogics(root);
  }
  export async function notifyBootstrapCompletion(this: any,
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
  export async function pickItem(this: any, items: LogicsItem[], placeHolder: string): Promise<LogicsItem | undefined> {
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
  export function postData(this: any, payload: {
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
  export function getStartupKitUpdatePromptStateKey(this: any, root: string): string {
    return `${STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX}:${path.resolve(root)}`;
  }
  export async function clearStartupKitUpdatePromptState(this: any, root: string): Promise<void> {
    await this.context.globalState.update(this.getStartupKitUpdatePromptStateKey(root), undefined);
  }
  export async function openItem(this: any, id: string): Promise<void> {
    await this.documentController.openItem(id);
  }
  export async function readItem(this: any, id: string): Promise<void> {
    await this.documentController.readItem(id);
  }
  export async function promoteItem(this: any, id: string): Promise<void> {
    await this.documentController.promoteItem(id);
  }
  export async function addReference(this: any, id: string): Promise<void> {
    await this.documentController.addReference(id);
  }
  export async function addUsedBy(this: any, id: string): Promise<void> {
    await this.documentController.addUsedBy(id);
  }
  export async function renameItem(this: any, id: string): Promise<void> {
    await this.documentController.renameItem(id);
  }
export function getHtmlForWebview(this: any, webview: vscode.Webview): string {
    return buildLogicsWebviewHtml(this.context.extensionUri, webview);
  }
export async function checkEnvironmentFromCommand(this: any): Promise<void> {
    await this.checkEnvironmentFromTools();
  }
export async function refreshAgentsFromCommand(this: any): Promise<void> {
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
export async function openHybridInsightsFromCommand(this: any): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }
export function openOnboardingFromCommand(this: any): void {
    this.openOnboardingPanel();
  }
export async function triageWorkflowDocFromCommand(this: any): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools();
  }
export async function assessDiffRiskFromCommand(this: any): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }
export async function buildValidationChecklistFromCommand(this: any): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }
export async function reviewDocConsistencyFromCommand(this: any): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }
export async function createRequest(this: any): Promise<void> {
    await this.documentController.createRequest();
  }
export async function startGuidedRequestFromTools(this: any): Promise<void> {
    await this.documentController.startGuidedRequestFromTools();
  }
export async function launchCodexFromTools(this: any): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchCodexFromTools(root);
  }
export async function launchClaudeFromTools(this: any): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchClaudeFromTools(root);
  }
export async function createItem(this: any, kind: "request" | "backlog" | "task"): Promise<void> {
    await this.documentController.createItem(kind);
  }
export async function createCompanionDoc(this: any,
    sourceId: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDoc(sourceId, preferredKind);
  }
export async function createCompanionDocFromPalette(this: any,
    preferredSourceId?: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDocFromPalette(preferredSourceId, preferredKind);
  }
export async function fixDocs(this: any): Promise<void> {
    await this.documentController.fixDocs();
  }
