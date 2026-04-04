import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { canPromote, indexLogics, isRequestProcessed, LogicsItem } from "./logicsIndexer";
import {
  AgentDefinition,
  AgentRegistrySnapshot,
  createEmptyAgentRegistry,
  loadAgentRegistry
} from "./agentRegistry";
import { parseGitStatusEntries } from "./workflowSupport";
import { buildLogicsWebviewHtml } from "./logicsWebviewHtml";
import { LogicsViewDocumentController } from "./logicsViewDocumentController";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import {
  areSamePath,
  getWorkspaceRoot,
  inspectLogicsBootstrapState,
  hasMultipleWorkspaceFolders,
  isExistingDirectory,
  runGitWithOutput,
  updateIndicatorsOnDisk
} from "./logicsProviderUtils";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { LogicsHybridAssistController } from "./logicsHybridAssistController";
import { LogicsCodexWorkflowController } from "./logicsCodexWorkflowController";
import { assertNever, parseLogicsWebviewMessage } from "./logicsViewMessages";

const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";

export class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private projectRootOverride: string | null;
  private invalidRootNotice?: string;
  private activeAgentId: string | null;
  private agentRegistry: AgentRegistrySnapshot = createEmptyAgentRegistry();
  private readPreviewPanel?: vscode.WebviewPanel;
  private readonly documentController: LogicsViewDocumentController;
  private readonly hybridAssistController: LogicsHybridAssistController;
  private readonly codexWorkflowController: LogicsCodexWorkflowController;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onProjectRootChanged: () => void,
    private readonly agentsOutput: vscode.OutputChannel
  ) {
    const storedOverride = this.context.workspaceState.get<string>(ROOT_OVERRIDE_STATE_KEY);
    this.projectRootOverride = storedOverride?.trim() || null;
    const storedAgentId = this.context.workspaceState.get<string>(ACTIVE_AGENT_STATE_KEY);
    this.activeAgentId = storedAgentId?.trim() || null;
    this.hybridAssistController = new LogicsHybridAssistController({
      context: this.context,
      getActionRoot: () => this.getActionRoot(),
      getItems: () => this.items,
      pickItem: (items, placeHolder) => this.pickItem(items, placeHolder),
      refresh: () => this.refresh()
    });
    this.codexWorkflowController = new LogicsCodexWorkflowController({
      refresh: () => this.refresh()
    });
    this.documentController = new LogicsViewDocumentController({
      context: this.context,
      agentsOutput: this.agentsOutput,
      getItems: () => this.items,
      getAgentRegistry: () => this.agentRegistry,
      getActionRoot: () => this.getActionRoot(),
      maybeOfferBootstrap: (root) => this.maybeOfferBootstrap(root),
      maybeShowCodexOverlayHandoff: (root, trigger) => this.maybeShowCodexOverlayHandoff(root, trigger),
      refresh: (selectedId) => this.refresh(selectedId),
      refreshAgents: (mode, root) => this.refreshAgents(mode, root),
      findRequestAuthoringAgent: () => this.findRequestAuthoringAgent(),
      setActiveAgent: (agentId) => this.setActiveAgent(agentId),
      injectPromptIntoCodexChat: (prompt, options) => this.injectPromptIntoCodexChat(prompt, options),
      getReadPreviewPanel: () => this.getReadPreviewPanel()
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    view.webview.html = this.getHtmlForWebview(view.webview);

    view.webview.onDidReceiveMessage(async (rawMessage) => {
      const message = parseLogicsWebviewMessage(rawMessage);
      if (!message) {
        return;
      }
      switch (message.type) {
        case "ready":
          await this.refresh();
          return;
        case "refresh":
          await this.refresh();
          return;
        case "open":
          await this.openItem(message.id);
          return;
        case "read":
          await this.readItem(message.id);
          return;
        case "promote":
          await this.promoteItem(message.id);
          return;
        case "add-reference":
          await this.addReference(message.id);
          return;
        case "add-used-by":
          await this.addUsedBy(message.id);
          return;
        case "rename-entry":
          await this.renameItem(message.id);
          return;
        case "create-companion-doc":
          await this.createCompanionDocFromPalette(message.id, message.preferredKind);
          return;
        case "create-item":
          await this.createItem(message.kind);
          return;
        case "new-request":
          await this.createRequest();
          return;
        case "new-request-guided":
          await this.startGuidedRequestFromTools();
          return;
        case "launch-codex-overlay":
          await this.launchCodexFromTools();
          return;
        case "fix-docs":
          await this.fixDocs();
          return;
        case "select-agent":
          await this.selectAgentFromPalette();
          return;
        case "inject-prompt":
          await this.injectPromptFromWebview(message.prompt, message.options);
          return;
        case "bootstrap-logics":
          await this.bootstrapFromTools();
          return;
        case "check-environment":
          await this.checkEnvironmentFromTools();
          return;
        case "check-hybrid-runtime":
          await this.checkHybridRuntimeFromTools();
          return;
        case "update-logics-kit":
          await this.updateLogicsKitFromTools();
          return;
        case "sync-codex-overlay":
          await this.syncCodexOverlayFromTools();
          return;
        case "assist-commit-all":
          await this.commitAllChangesFromTools();
          return;
        case "assist-next-step":
          await this.suggestNextStepFromTools();
          return;
        case "assist-triage":
          await this.triageWorkflowDocFromTools();
          return;
        case "assist-diff-risk":
          await this.assessDiffRiskFromTools();
          return;
        case "assist-summarize-validation":
          await this.summarizeValidationFromTools();
          return;
        case "assist-validation-checklist":
          await this.buildValidationChecklistFromTools();
          return;
        case "assist-doc-consistency":
          await this.reviewDocConsistencyFromTools();
          return;
        case "open-hybrid-insights":
          await this.openHybridInsightsFromTools();
          return;
        case "about":
          await this.openAbout();
          return;
        case "change-project-root":
          await this.changeProjectRoot();
          return;
        case "reset-project-root":
          await this.resetProjectRoot();
          return;
        case "mark-done":
          await this.markItemDone(message.id);
          return;
        case "mark-obsolete":
          await this.markItemObsolete(message.id);
          return;
        default:
          assertNever(message);
      }
    });

  }

  getWatcherRoot(): string | null {
    return this.resolveProjectRoot().root;
  }

  async refresh(selectedId?: string): Promise<void> {
    const { root, invalidOverridePath } = this.resolveProjectRoot();
    const canResetProjectRoot = this.canResetProjectRoot();
    const bootstrapState = root ? inspectLogicsBootstrapState(root) : null;
    const canBootstrapLogics = Boolean(bootstrapState?.canBootstrap);
    this.notifyInvalidRootOverride(invalidOverridePath, Boolean(root));
    if (!root) {
      this.items = [];
      await this.clearAgentRegistry();
      this.postData({
        canBootstrapLogics,
        bootstrapLogicsTitle: bootstrapState?.actionTitle,
        canResetProjectRoot,
        error: invalidOverridePath
          ? `Configured project root not found: ${invalidOverridePath}. Use Tools > Change Project Root.`
          : "Open a workspace or set a project root from Tools > Change Project Root."
      });
      return;
    }

    if (!fs.existsSync(path.join(root, "logics"))) {
      this.items = [];
      await this.clearAgentRegistry();
      this.postData({
        canBootstrapLogics,
        bootstrapLogicsTitle: bootstrapState?.actionTitle,
        canResetProjectRoot,
        error: `This branch does not have a logics/ folder in: ${root}.`
      });
      await this.maybeOfferBootstrap(root);
      return;
    }

    this.items = indexLogics(root);
    await this.refreshAgents("silent", root);
    const changedPaths = await this.getGitChangedPaths(root);
    this.postData({
      items: this.items,
      root,
      selectedId,
      canBootstrapLogics,
      bootstrapLogicsTitle: bootstrapState?.actionTitle,
      canResetProjectRoot,
      activeAgentId: this.activeAgentId ?? undefined,
      activeAgent: this.getActiveAgentPayload(),
      changedPaths
    });
    await this.maybeOfferBootstrap(root);
    await this.codexWorkflowController.ensureGlobalCodexKit(root);
    await this.maybeOfferCodexStartupRemediation(root);
  }

  async openFromPalette(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const pick = await this.pickItem(this.items, "Open Logics item");
    if (pick) {
      await this.openItem(pick.id);
    }
  }

  async promoteFromPalette(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const promotable = this.items.filter(
      (item) => canPromote(item.stage) && !item.isPromoted && !isRequestProcessed(item, this.items)
    );
    const pick = await this.pickItem(promotable, "Promote Logics item");
    if (pick) {
      await this.promoteItem(pick.id);
    }
  }

  async selectAgentFromPalette(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      return;
    }

    await this.refreshAgents("silent", root);
    if (!this.agentRegistry.agents.length) {
      const issueHint = this.agentRegistry.issues.length > 0 ? " Check 'Logics Agents' output for validation errors." : "";
      void vscode.window.showWarningMessage(`No agents found in logics/skills/*/agents/openai.yaml.${issueHint}`);
      if (this.agentRegistry.issues.length > 0) {
        this.agentsOutput.show(true);
      }
      return;
    }

    const pick = await vscode.window.showQuickPick(
      this.agentRegistry.agents.map((agent) => ({
        label: agent.displayName,
        description: agent.shortDescription,
        detail: agent.id,
        agent
      })),
      {
        title: "Logics: Select Agent",
        placeHolder: "Choose an agent to use in Codex chat"
      }
    );
    if (!pick) {
      return;
    }

    await this.setActiveAgent(pick.agent.id);
    await this.injectAgentPromptIntoCodexChat(pick.agent);
    void vscode.window.showInformationMessage(`Active Logics agent: ${pick.agent.displayName} (${pick.agent.id})`);
    await this.maybeShowCodexOverlayHandoff(root, "agent selection");
  }

  async checkEnvironmentFromCommand(): Promise<void> {
    await this.checkEnvironmentFromTools();
  }

  async refreshAgentsFromCommand(): Promise<void> {
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

  async openHybridInsightsFromCommand(): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }

  async triageWorkflowDocFromCommand(): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools();
  }

  async assessDiffRiskFromCommand(): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }

  async buildValidationChecklistFromCommand(): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }

  async reviewDocConsistencyFromCommand(): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }

  async createRequest(): Promise<void> {
    await this.documentController.createRequest();
  }

  async startGuidedRequestFromTools(): Promise<void> {
    await this.documentController.startGuidedRequestFromTools();
  }

  private async launchCodexFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchCodexFromTools(root);
  }

  async createItem(kind: "request" | "backlog" | "task"): Promise<void> {
    await this.documentController.createItem(kind);
  }

  async createCompanionDoc(
    sourceId: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDoc(sourceId, preferredKind);
  }

  async createCompanionDocFromPalette(
    preferredSourceId?: string,
    preferredKind?: "product" | "architecture"
  ): Promise<void> {
    await this.documentController.createCompanionDocFromPalette(preferredSourceId, preferredKind);
  }

  async fixDocs(): Promise<void> {
    await this.documentController.fixDocs();
  }

  private async bootstrapFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (bootstrapState.status === "canonical") {
      void vscode.window.showInformationMessage("Logics bootstrap already configured.");
      return;
    }
    if (bootstrapState.status === "noncanonical") {
      void vscode.window.showWarningMessage(
        `Bootstrap Logics is unavailable until the current logics/skills setup is repaired. ${bootstrapState.reason}`
      );
      return;
    }
    await this.codexWorkflowController.bootstrapLogics(root);
  }

  private async checkEnvironmentFromTools(): Promise<void> {
    const { root, invalidOverridePath } = this.resolveProjectRoot();
    const snapshot = await inspectLogicsEnvironment(root, invalidOverridePath);
    const hybridRuntime = snapshot.hybridRuntime ?? {
      state: "unavailable",
      summary: "Hybrid assist runtime status is unavailable.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["hybrid-runtime-unreported"],
      claudeBridgeAvailable: false,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
    const hybridCapability = snapshot.capabilities.hybridAssist ?? {
      status: "unavailable",
      summary: "Hybrid assist capability is unavailable."
    };
    const quickPickItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }> = [];

    if (root) {
      const kitVersionItem = this.buildKitVersionQuickPickItem(root);
      if (kitVersionItem) {
        quickPickItems.push(kitVersionItem);
      }
    }

    if (root && snapshot.codexOverlay.status === "missing-manager") {
      quickPickItems.push({
        label: "Run: Update Logics Kit",
        description: "Try the canonical submodule update flow from inside the plugin.",
        action: async () => {
          await this.codexWorkflowController.updateLogicsKit(root, "environment diagnostics");
        }
      });
    }

    if (root) {
      const providerItem = await this.hybridAssistController.buildProviderRemediationQuickPickItem(root);
      if (providerItem) {
        quickPickItems.push(providerItem);
      }
    }

    if (root) {
      const yamlItem = this.buildLogicsYamlBlocksQuickPickItem(root);
      if (yamlItem) {
        quickPickItems.push(yamlItem);
      }
    }

    if (root) {
      const gitignoreItem = await this.buildGitignoreArtifactsQuickPickItem(root);
      if (gitignoreItem) {
        quickPickItems.push(gitignoreItem);
      }
    }

    if (
      root &&
      snapshot.codexOverlay.status !== "healthy" &&
      snapshot.codexOverlay.status !== "warning" &&
      snapshot.codexOverlay.status !== "missing-manager"
    ) {
      quickPickItems.push({
        label: "Run: Publish Global Codex Kit",
        description: "Publish or repair the shared global Codex Logics kit from this repository.",
        action: async () => {
          await this.codexWorkflowController.syncCodexOverlay(root, "environment diagnostics");
        }
      });
    }

    quickPickItems.push(
      {
        label: `Workspace root: ${snapshot.root ?? "(none selected)"}`,
        description: `Repository state: ${snapshot.repositoryState}`
      },
      {
        label: `Global Codex kit: ${snapshot.codexOverlay.status === "healthy" ? "Ready" : snapshot.codexOverlay.status === "warning" ? "Ready with warnings" : "Needs attention"}`,
        description: snapshot.codexOverlay.summary
      },
      {
        label: `Read-only browsing: ${snapshot.capabilities.readOnly.status === "available" ? "Available" : "Unavailable"}`,
        description: snapshot.capabilities.readOnly.summary
      },
      {
        label: `Workflow actions: ${snapshot.capabilities.workflowMutation.status === "available" ? "Available" : "Unavailable"}`,
        description: snapshot.capabilities.workflowMutation.summary
      },
      {
        label: `Bootstrap or repair: ${snapshot.capabilities.bootstrapRepair.status === "available" ? "Available" : "Unavailable"}`,
        description: snapshot.capabilities.bootstrapRepair.summary
      },
      {
        label: `Codex runtime: ${snapshot.capabilities.codexRuntime.status === "available" ? "Available" : "Unavailable"}`,
        description: snapshot.capabilities.codexRuntime.summary
      },
      {
        label: `Hybrid assist runtime: ${hybridRuntime.state === "ready" ? "Ready" : hybridRuntime.state === "degraded" ? "Degraded" : "Unavailable"}`,
        description: hybridRuntime.summary
      },
      {
        label: `Hybrid assist actions: ${hybridCapability.status === "available" ? "Available" : "Unavailable"}`,
        description: hybridCapability.summary
      },
      {
        label: `Claude bridge: ${hybridRuntime.claudeBridgeAvailable ? "Available" : "Missing"}`,
        description: hybridRuntime.claudeBridgeAvailable
          ? "Claude bridge files point to the shared hybrid runtime."
          : "Hybrid runtime stays usable, but the thin Claude bridge is missing."
      },
      {
        label: "Hybrid runtime entrypoint",
        description: hybridRuntime.windowsSafeEntrypoint
      },
      {
        label: `Git: ${snapshot.git.available ? "Detected" : "Missing"}`,
        description: snapshot.git.available ? "Git is available on PATH." : buildMissingGitMessage()
      },
      {
        label: `Python 3: ${snapshot.python.available ? `Detected (${snapshot.python.command?.displayLabel || "python"})` : "Missing"}`,
        description: snapshot.python.available
          ? "Python-backed workflow actions can run."
          : buildMissingPythonMessage()
      }
    );

    if (snapshot.missingWorkflowDirs.length > 0) {
      quickPickItems.push({
        label: "Partial bootstrap: workflow directories will self-heal",
        description: `Missing directories: ${snapshot.missingWorkflowDirs.join(", ")}. Create flows will recreate them automatically.`
      });
    }

    if (snapshot.codexOverlay.installedVersion) {
      quickPickItems.push({
        label: "Global Logics kit version",
        description: snapshot.codexOverlay.installedVersion
      });
    }

    if (snapshot.codexOverlay.sourceRepo) {
      quickPickItems.push({
        label: "Global Logics kit source",
        description: snapshot.codexOverlay.sourceRepo
      });
    }

    if (snapshot.codexOverlay.runCommand) {
      quickPickItems.push({
        label: "Codex launch command",
        description: snapshot.codexOverlay.runCommand
      });
    }

    for (const issue of snapshot.codexOverlay.issues.slice(0, 3)) {
      quickPickItems.push({
        label: "Global kit issue",
        description: issue
      });
    }

    for (const reason of hybridRuntime.degradedReasons.slice(0, 3)) {
      quickPickItems.push({
        label: "Hybrid runtime note",
        description: reason
      });
    }

    const choice = await vscode.window.showQuickPick(quickPickItems, {
      title: "Logics: Check Environment",
      placeHolder: "Review current prerequisite and repository capability status",
      ignoreFocusOut: true
    });
    if (choice?.action) {
      await choice.action();
    }
  }

  private async buildGitignoreArtifactsQuickPickItem(
    root: string
  ): Promise<(vscode.QuickPickItem & { action: () => Promise<void> }) | null> {
    const ARTIFACTS = [
      "logics/hybrid_audit.jsonl",
      "logics/hybrid_measurement.jsonl",
      "logics/mutation_audit.jsonl"
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
      label: `Run: Add hybrid runtime artifacts to .gitignore (${tracked.length} file(s) tracked)`,
      description: `${tracked.join(", ")} — generated files that should not be committed.`,
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

  private buildLogicsYamlBlocksQuickPickItem(
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
      label: `Run: Add missing logics.yaml blocks (${names})`,
      description: "These blocks enable transactional mutations and the runtime index cache.",
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

  private buildKitVersionQuickPickItem(
    root: string
  ): (vscode.QuickPickItem & { action: () => Promise<void> }) | null {
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
    if (parts.length < 2 || parts.some(isNaN)) {
      return null;
    }
    // Minimum version for full hybrid assist + .env.local merge support
    const MIN_MAJOR = 1;
    const MIN_MINOR = 7;
    const [major, minor] = parts;
    const isTooOld =
      major < MIN_MAJOR || (major === MIN_MAJOR && minor < MIN_MINOR);
    if (!isTooOld) {
      return null;
    }
    return {
      label: `Run: Update Logics Kit (local kit is v${raw}, minimum recommended v${MIN_MAJOR}.${MIN_MINOR}.x)`,
      description: "Older kit missing .env.local merge, bootstrap credential scaffolding, and multi-provider dispatch.",
      action: async () => {
        await this.codexWorkflowController.updateLogicsKit(root, "environment diagnostics");
      }
    };
  }

  private async checkHybridRuntimeFromTools(): Promise<void> {
    await this.hybridAssistController.checkHybridRuntimeFromTools();
  }

  private async commitAllChangesFromTools(): Promise<void> {
    await this.hybridAssistController.commitAllChangesFromTools();
  }

  private async suggestNextStepFromTools(): Promise<void> {
    await this.hybridAssistController.suggestNextStepFromTools();
  }

  private async triageWorkflowDocFromTools(): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools();
  }

  private async assessDiffRiskFromTools(): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }

  private async summarizeValidationFromTools(): Promise<void> {
    await this.hybridAssistController.summarizeValidationFromTools();
  }

  private async buildValidationChecklistFromTools(): Promise<void> {
    await this.hybridAssistController.buildValidationChecklistFromTools();
  }

  private async reviewDocConsistencyFromTools(): Promise<void> {
    await this.hybridAssistController.reviewDocConsistencyFromTools();
  }

  private async openHybridInsightsFromTools(): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }

  private async openAbout(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(PROJECT_GITHUB_URL));
  }

  private async updateLogicsKitFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.updateLogicsKit(root, "tools menu");
  }

  private async syncCodexOverlayFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.syncCodexOverlay(root, "tools menu");
  }

  private async markItemDone(id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Done", "100%");
  }

  private async markItemObsolete(id: string): Promise<void> {
    await this.updateItemLifecycle(id, "Obsolete", "100%");
  }

  private async updateItemLifecycle(id: string, status: string, progress: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
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

  private async changeProjectRoot(): Promise<void> {
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

  private async resetProjectRoot(): Promise<void> {
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

  private canResetProjectRoot(): boolean {
    if (!this.projectRootOverride) {
      return false;
    }
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return true;
    }
    return !areSamePath(this.projectRootOverride, workspaceRoot);
  }

  private resolveProjectRoot(): {
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

  private notifyInvalidRootOverride(invalidOverridePath: string | undefined, hasFallbackRoot: boolean): void {
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

  private async getActionRoot(): Promise<string | null> {
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

  private async clearAgentRegistry(): Promise<void> {
    this.agentRegistry = createEmptyAgentRegistry();
    if (this.activeAgentId) {
      await this.setActiveAgent(null);
    }
  }

  private async refreshAgents(mode: "silent" | "notify", root: string): Promise<void> {
    const snapshot = loadAgentRegistry(root);
    this.agentRegistry = snapshot;

    const activeStillExists = this.activeAgentId
      ? snapshot.agents.some((agent) => agent.id === this.activeAgentId)
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

  private writeAgentScanOutput(snapshot: AgentRegistrySnapshot, root: string, reveal: boolean): void {
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

  private async setActiveAgent(agentId: string | null): Promise<void> {
    this.activeAgentId = agentId;
    if (agentId) {
      await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, agentId);
      return;
    }
    await this.context.workspaceState.update(ACTIVE_AGENT_STATE_KEY, undefined);
  }

  private findRequestAuthoringAgent(): AgentDefinition | undefined {
    return this.agentRegistry.agents.find((agent) => agent.id === "$logics-flow-manager");
  }

  private async injectPromptIntoCodexChat(
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
        ? "Prompt copied to clipboard. Open a new Codex thread, then paste it into the composer."
        : "Prompt copied to clipboard for Codex. Paste it into the Codex composer.");
    const fallbackCopiedMessage = options?.fallbackCopiedMessage || "Could not copy the prompt to the clipboard.";

    try {
      await vscode.env.clipboard.writeText(normalizedPrompt);
      void vscode.window.showInformationMessage(codexCopiedMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showWarningMessage(`${fallbackCopiedMessage} (${message})`);
    }
  }

  private async injectAgentPromptIntoCodexChat(agent: AgentDefinition): Promise<void> {
    await this.injectPromptIntoCodexChat(agent.defaultPrompt, {
      codexCopiedMessage: "Agent prompt copied to clipboard for Codex. Paste it into the Codex composer.",
      fallbackCopiedMessage: "Could not copy the agent prompt to the clipboard."
    });
  }

  private async injectPromptFromWebview(
    prompt: string,
    options?: {
      codexCopiedMessage?: string;
      fallbackCopiedMessage?: string;
      preferNewThread?: boolean;
    }
  ): Promise<void> {
    await this.injectPromptIntoCodexChat(prompt, {
      codexCopiedMessage: options?.codexCopiedMessage ?? (options?.preferNewThread
        ? "Context pack copied to clipboard. Open a new Codex thread, then paste it into the composer."
        : "Context pack copied to clipboard for Codex. Paste it into the Codex composer."),
      fallbackCopiedMessage: options?.fallbackCopiedMessage ?? "Could not copy the context pack to the clipboard.",
      preferNewThread: options?.preferNewThread
    });
  }

  private getActiveAgentPayload():
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
    const agent = this.agentRegistry.agents.find((entry) => entry.id === this.activeAgentId);
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

  private async getGitChangedPaths(root: string): Promise<string[]> {
    const result = await runGitWithOutput(root, ["status", "--short"]);
    if (result.error) {
      return [];
    }
    return parseGitStatusEntries(result.stdout)
      .map((entry) => entry.path)
      .filter((entry, index, collection) => entry.length > 0 && collection.indexOf(entry) === index)
      .slice(0, 40);
  }

  private getReadPreviewPanel(): vscode.WebviewPanel {
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

  private async maybeOfferBootstrap(root: string): Promise<void> {
    await this.codexWorkflowController.maybeOfferBootstrap(root);
  }

  private async maybeOfferCodexStartupRemediation(root: string): Promise<void> {
    await this.codexWorkflowController.maybeOfferCodexStartupRemediation(root);
  }

  private async maybeShowCodexOverlayHandoff(root: string, trigger: string): Promise<void> {
    await this.codexWorkflowController.maybeShowCodexOverlayHandoff(root, trigger);
  }

  private async bootstrapLogics(root: string): Promise<void> {
    await this.codexWorkflowController.bootstrapLogics(root);
  }

  private async notifyBootstrapCompletion(
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

  private async pickItem(items: LogicsItem[], placeHolder: string): Promise<LogicsItem | undefined> {
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

  private postData(payload: {
    items?: LogicsItem[];
    root?: string;
    error?: string;
    selectedId?: string;
    canBootstrapLogics?: boolean;
    bootstrapLogicsTitle?: string;
    canResetProjectRoot?: boolean;
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

  private async openItem(id: string): Promise<void> {
    await this.documentController.openItem(id);
  }

  private async readItem(id: string): Promise<void> {
    await this.documentController.readItem(id);
  }

  private async promoteItem(id: string): Promise<void> {
    await this.documentController.promoteItem(id);
  }

  private async addReference(id: string): Promise<void> {
    await this.documentController.addReference(id);
  }

  private async addUsedBy(id: string): Promise<void> {
    await this.documentController.addUsedBy(id);
  }

  private async renameItem(id: string): Promise<void> {
    await this.documentController.renameItem(id);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    return buildLogicsWebviewHtml(this.context.extensionUri, webview);
  }
}
