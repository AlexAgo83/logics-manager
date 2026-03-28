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
import { buildBootstrapCommitMessage, isBootstrapScopedPath, parseGitStatusEntries } from "./workflowSupport";
import { buildLogicsWebviewHtml } from "./logicsWebviewHtml";
import { buildHybridInsightsHtml } from "./logicsHybridInsightsHtml";
import { LogicsViewDocumentController } from "./logicsViewDocumentController";
import { inspectLogicsEnvironment } from "./logicsEnvironment";
import {
  areSamePath,
  buildLogicsKitUpdateCommand,
  getWorkspaceRoot,
  inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule,
  hasMultipleWorkspaceFolders,
  isExistingDirectory,
  runGitWithOutput,
  runPythonWithOutput,
  updateIndicatorsOnDisk
} from "./logicsProviderUtils";
import { buildMissingGitMessage, isMissingGitFailureDetail } from "./gitRuntime";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import { publishCodexWorkspaceOverlay, shouldPublishRepoKit } from "./logicsCodexWorkspace";

const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";

export class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private readonly bootstrapPromptedRoots = new Set<string>();
  private readonly codexRemediationPromptedKeys = new Set<string>();
  private projectRootOverride: string | null;
  private invalidRootNotice?: string;
  private activeAgentId: string | null;
  private agentRegistry: AgentRegistrySnapshot = createEmptyAgentRegistry();
  private readPreviewPanel?: vscode.WebviewPanel;
  private hybridInsightsPanel?: vscode.WebviewPanel;
  private readonly documentController: LogicsViewDocumentController;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onProjectRootChanged: () => void,
    private readonly agentsOutput: vscode.OutputChannel
  ) {
    const storedOverride = this.context.workspaceState.get<string>(ROOT_OVERRIDE_STATE_KEY);
    this.projectRootOverride = storedOverride?.trim() || null;
    const storedAgentId = this.context.workspaceState.get<string>(ACTIVE_AGENT_STATE_KEY);
    this.activeAgentId = storedAgentId?.trim() || null;
    this.documentController = new LogicsViewDocumentController({
      context: this.context,
      agentsOutput: this.agentsOutput,
      getItems: () => this.items,
      getAgentRegistry: () => this.agentRegistry,
      getActionRoot: () => this.getActionRoot(),
      maybeOfferBootstrap: (root) => this.maybeOfferBootstrap(root),
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

    view.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "ready":
          await this.refresh();
          break;
        case "refresh":
          await this.refresh();
          break;
        case "open":
          await this.openItem(message.id);
          break;
        case "read":
          await this.readItem(message.id);
          break;
        case "promote":
          await this.promoteItem(message.id);
          break;
        case "add-reference":
          await this.addReference(message.id);
          break;
        case "add-used-by":
          await this.addUsedBy(message.id);
          break;
        case "rename-entry":
          await this.renameItem(message.id);
          break;
        case "create-companion-doc":
          await this.createCompanionDocFromPalette(message.id, message.preferredKind);
          break;
        case "create-item":
          await this.createItem(message.kind);
          break;
        case "new-request":
          await this.createRequest();
          break;
        case "new-request-guided":
          await this.startGuidedRequestFromTools();
          break;
        case "launch-codex-overlay":
          await this.launchCodexFromTools();
          break;
        case "fix-docs":
          await this.fixDocs();
          break;
        case "select-agent":
          await this.selectAgentFromPalette();
          break;
        case "inject-prompt":
          await this.injectPromptFromWebview(message.prompt, message.options);
          break;
        case "bootstrap-logics":
          await this.bootstrapFromTools();
          break;
        case "check-environment":
          await this.checkEnvironmentFromTools();
          break;
        case "check-hybrid-runtime":
          await this.checkHybridRuntimeFromTools();
          break;
        case "update-logics-kit":
          await this.updateLogicsKitFromTools();
          break;
        case "sync-codex-overlay":
          await this.syncCodexOverlayFromTools();
          break;
        case "assist-commit-all":
          await this.commitAllChangesFromTools();
          break;
        case "assist-next-step":
          await this.suggestNextStepFromTools();
          break;
        case "assist-triage":
          await this.triageWorkflowDocFromTools();
          break;
        case "assist-diff-risk":
          await this.assessDiffRiskFromTools();
          break;
        case "assist-summarize-validation":
          await this.summarizeValidationFromTools();
          break;
        case "assist-validation-checklist":
          await this.buildValidationChecklistFromTools();
          break;
        case "assist-doc-consistency":
          await this.reviewDocConsistencyFromTools();
          break;
        case "open-hybrid-insights":
          await this.openHybridInsightsFromTools();
          break;
        case "about":
          await this.openAbout();
          break;
        case "change-project-root":
          await this.changeProjectRoot();
          break;
        case "reset-project-root":
          await this.resetProjectRoot();
          break;
        case "mark-done":
          await this.markItemDone(message.id);
          break;
        case "mark-obsolete":
          await this.markItemObsolete(message.id);
          break;
        default:
          break;
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
        error: `No logics/ folder found in: ${root}.`
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
    await this.ensureGlobalCodexKit(root);
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
    await this.openHybridInsightsFromTools();
  }

  async triageWorkflowDocFromCommand(): Promise<void> {
    await this.triageWorkflowDocFromTools();
  }

  async assessDiffRiskFromCommand(): Promise<void> {
    await this.assessDiffRiskFromTools();
  }

  async buildValidationChecklistFromCommand(): Promise<void> {
    await this.buildValidationChecklistFromTools();
  }

  async reviewDocConsistencyFromCommand(): Promise<void> {
    await this.reviewDocConsistencyFromTools();
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

    const snapshot = await inspectLogicsEnvironment(root);
    const globalKit = snapshot.codexOverlay;
    if ((globalKit.status === "healthy" || globalKit.status === "warning") && globalKit.runCommand) {
      this.launchCodexOverlayTerminal(root, globalKit.runCommand);
      return;
    }

    await this.syncCodexOverlay(root, "Tools > Launch Codex", { autoLaunchOnSuccess: true });
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
    await this.bootstrapLogics(root);
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

    if (root && snapshot.codexOverlay.status === "missing-manager") {
      quickPickItems.push({
        label: "Run: Update Logics Kit",
        description: "Try the canonical submodule update flow from inside the plugin.",
        action: async () => {
          await this.updateLogicsKit(root, "environment diagnostics");
        }
      });
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
          await this.syncCodexOverlay(root, "environment diagnostics");
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

  private async runHybridAssistCommand(root: string, args: string[]): Promise<Record<string, unknown> | null> {
    return this.runHybridAssistCommandWithOptions(root, args, {
      actionLabel: "Hybrid assist"
    });
  }

  private async runHybridAssistCommandWithOptions(
    root: string,
    args: string[],
    options: {
      actionLabel: string;
    }
  ): Promise<Record<string, unknown> | null> {
    const runtimeEntry = path.join(root, "logics", "skills", "logics.py");
    if (!fs.existsSync(runtimeEntry)) {
      void vscode.window.showErrorMessage(
        `${options.actionLabel} is unavailable because logics/skills/logics.py is missing.`
      );
      return null;
    }

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${options.actionLabel}: waiting on hybrid assist backend...`,
        cancellable: false
      },
      async () => runPythonWithOutput(root, runtimeEntry, ["flow", "assist", ...args, "--format", "json"])
    );
    if (result.error) {
      void vscode.window.showErrorMessage(
        `${options.actionLabel} failed: ${result.stderr || result.error.message}`
      );
      return null;
    }

    try {
      return JSON.parse(result.stdout) as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`${options.actionLabel} returned invalid JSON: ${message}`);
      return null;
    }
  }

  private describeHybridAssistOutcome(payload: Record<string, unknown>): {
    backendUsed: string | null;
    backendRequested: string | null;
    degradedReasons: string[];
    degraded: boolean;
  } {
    const backend = payload.backend as Record<string, unknown> | undefined;
    const backendUsed =
      typeof payload.backend_used === "string"
        ? payload.backend_used
        : typeof backend?.selected_backend === "string"
          ? String(backend.selected_backend)
          : null;
    const backendRequested =
      typeof payload.backend_requested === "string"
        ? payload.backend_requested
        : typeof backend?.requested_backend === "string"
          ? String(backend.requested_backend)
          : null;
    const degradedReasons = Array.isArray(payload.degraded_reasons)
      ? payload.degraded_reasons.map((value) => String(value)).filter((value) => value.length > 0)
      : [];
    const degraded =
      Boolean(payload.degraded) ||
      payload.result_status === "degraded" ||
      degradedReasons.length > 0;
    return {
      backendUsed,
      backendRequested,
      degradedReasons,
      degraded
    };
  }

  private notifyHybridAssistCompletion(
    actionLabel: string,
    payload: Record<string, unknown>,
    detail: string
  ): void {
    const outcome = this.describeHybridAssistOutcome(payload);
    const backendLabel = outcome.backendUsed
      ? outcome.backendRequested === "auto" && outcome.backendUsed === "codex"
        ? ` via ${outcome.backendUsed} (fallback)`
        : ` via ${outcome.backendUsed}`
      : "";
    const degradedDetail = outcome.degradedReasons.length > 0
      ? ` Degraded reasons: ${outcome.degradedReasons.join(", ")}.`
      : "";
    const message = `${actionLabel} completed${backendLabel}. ${detail}${degradedDetail}`.trim();
    if (outcome.degraded) {
      void vscode.window.showWarningMessage(message);
      return;
    }
    void vscode.window.showInformationMessage(message);
  }

  private async checkHybridRuntimeFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["runtime-status"], {
      actionLabel: "Check Hybrid Runtime"
    });
    if (!payload) {
      return;
    }
    const statusLabel = (payload as { degraded?: boolean }).degraded ? "Runtime is degraded." : "Runtime is ready.";
    this.notifyHybridAssistCompletion("Check Hybrid Runtime", payload, statusLabel);
  }

  private async commitAllChangesFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["commit-all"], {
      actionLabel: "Build Commit Plan"
    });
    if (!payload) {
      return;
    }
    const plan = payload.plan as { steps?: Array<{ scope?: string; summary?: string }> } | undefined;
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    const summary = steps.length > 0 ? steps.map((step) => `${step.scope}: ${step.summary}`).join(" | ") : "No commit steps suggested.";
    const outcome = this.describeHybridAssistOutcome(payload);
    const backendLabel = outcome.backendUsed
      ? outcome.backendRequested === "auto" && outcome.backendUsed === "codex"
        ? ` via ${outcome.backendUsed} (fallback)`
        : ` via ${outcome.backendUsed}`
      : "";
    const choice = await vscode.window.showInformationMessage(
      `Build Commit Plan completed${backendLabel}. ${summary}`,
      "Execute Commit Plan"
    );
    if (choice === "Execute Commit Plan") {
      const executed = await this.runHybridAssistCommandWithOptions(root, ["commit-all", "--execution-mode", "execute"], {
        actionLabel: "Execute Commit Plan"
      });
      if (!executed) {
        return;
      }
      this.notifyHybridAssistCompletion("Execute Commit Plan", executed, "Commit plan executed.");
      await this.refresh();
    }
  }

  private async suggestNextStepFromTools(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const pick = await this.pickItem(this.items.filter((item) => ["request", "backlog", "task"].includes(item.stage)), "Suggest next workflow step");
    if (!pick) {
      return;
    }
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["next-step", pick.id], {
      actionLabel: "Suggest Next Step"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { decision?: { action?: string; target_ref?: string }; mapped_command?: { summary?: string } } | undefined;
    const decision = result?.decision;
    this.notifyHybridAssistCompletion(
      "Suggest Next Step",
      payload,
      `${decision?.action || "unknown"} on ${decision?.target_ref || "no target"}. ${result?.mapped_command?.summary || ""}`.trim()
    );
  }

  private async triageWorkflowDocFromTools(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const pick = await this.pickItem(this.items.filter((item) => ["request", "backlog", "task"].includes(item.stage)), "Triage workflow doc");
    if (!pick) {
      return;
    }
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["triage", pick.id], {
      actionLabel: "Triage Item"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { classification?: string; summary?: string; next_actions?: string[] } | undefined;
    const nextActions = Array.isArray(result?.next_actions) ? result?.next_actions : [];
    const detail = [
      result?.classification ? `Classification: ${result.classification}.` : "",
      result?.summary || "",
      nextActions.length > 0 ? `Next actions: ${nextActions.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Triage Item", payload, detail || "Triage completed.");
  }

  private async assessDiffRiskFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["diff-risk"], {
      actionLabel: "Assess Diff Risk"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { risk?: string; summary?: string; drivers?: string[] } | undefined;
    const drivers = Array.isArray(result?.drivers) ? result.drivers : [];
    const detail = [
      result?.risk ? `Risk: ${result.risk}.` : "",
      result?.summary || "",
      drivers.length > 0 ? `Drivers: ${drivers.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Assess Diff Risk", payload, detail || "Diff risk assessed.");
  }

  private async summarizeValidationFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["summarize-validation"], {
      actionLabel: "Summarize Validation"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { overall?: string; summary?: string } | undefined;
    this.notifyHybridAssistCompletion(
      "Summarize Validation",
      payload,
      `Validation summary (${result?.overall || "unknown"}): ${result?.summary || ""}`.trim()
    );
  }

  private async buildValidationChecklistFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["validation-checklist"], {
      actionLabel: "Build Validation Checklist"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { profile?: string; checks?: string[] } | undefined;
    const checks = Array.isArray(result?.checks) ? result.checks : [];
    const detail = `Checklist profile ${result?.profile || "unknown"} with ${checks.length} check(s).`;
    this.notifyHybridAssistCompletion("Build Validation Checklist", payload, detail);
  }

  private async reviewDocConsistencyFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const payload = await this.runHybridAssistCommandWithOptions(root, ["doc-consistency"], {
      actionLabel: "Review Doc Consistency"
    });
    if (!payload) {
      return;
    }
    const result = payload.result as { overall?: string; summary?: string; issues?: string[] } | undefined;
    const issues = Array.isArray(result?.issues) ? result.issues : [];
    const detail = [
      result?.overall ? `Overall: ${result.overall}.` : "",
      result?.summary || "",
      issues.length > 0 ? `Issues: ${issues.slice(0, 2).join(" | ")}` : ""
    ]
      .filter((value) => value.trim().length > 0)
      .join(" ")
      .trim();
    this.notifyHybridAssistCompletion("Review Doc Consistency", payload, detail || "Doc consistency review completed.");
  }

  private async openHybridInsightsFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    const panel = this.getHybridInsightsPanel();
    panel.reveal(vscode.ViewColumn.Beside, true);
    await this.refreshHybridInsightsPanel(root);
  }

  private async refreshHybridInsightsPanel(root: string): Promise<void> {
    const panel = this.getHybridInsightsPanel();
    const payload = await this.runHybridAssistCommandWithOptions(root, ["roi-report"], {
      actionLabel: "Refresh Hybrid Insights"
    });
    if (!payload) {
      return;
    }
    panel.title = `Hybrid Insights: ${path.basename(root)}`;
    panel.webview.html = buildHybridInsightsHtml({
      webview: panel.webview,
      report: payload,
      rootLabel: path.basename(root) || root
    });
  }

  private async openHybridInsightsSourceLog(root: string, source: "audit" | "measurement"): Promise<void> {
    const payload = await this.runHybridAssistCommand(root, ["roi-report", "--recent-limit", "1"]);
    if (!payload) {
      return;
    }
    const sources = (payload.sources ?? {}) as Record<string, unknown>;
    const relPath =
      source === "audit"
        ? typeof sources.audit_log === "string"
          ? sources.audit_log
          : ""
        : typeof sources.measurement_log === "string"
          ? sources.measurement_log
          : "";
    if (!relPath) {
      void vscode.window.showWarningMessage("Hybrid insights source log path is unavailable.");
      return;
    }
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) {
      void vscode.window.showWarningMessage(`Hybrid insights source log not found: ${relPath}`);
      return;
    }
    const document = await vscode.workspace.openTextDocument(fullPath);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private async openAbout(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(PROJECT_GITHUB_URL));
  }

  private async updateLogicsKitFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.updateLogicsKit(root, "tools menu");
  }

  private async syncCodexOverlayFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.syncCodexOverlay(root, "tools menu");
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
      preferNewThread?: boolean;
    }
  ): Promise<void> {
    await this.injectPromptIntoCodexChat(prompt, {
      codexCopiedMessage: options?.preferNewThread
        ? "Context pack copied to clipboard. Open a new Codex thread, then paste it into the composer."
        : "Context pack copied to clipboard for Codex. Paste it into the Codex composer.",
      fallbackCopiedMessage: "Could not copy the context pack to the clipboard.",
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

  private async maybeOfferBootstrap(root: string): Promise<void> {
    if (this.bootstrapPromptedRoots.has(root)) {
      return;
    }
    const bootstrapState = inspectLogicsBootstrapState(root);
    if (bootstrapState.status === "canonical") {
      return;
    }
    this.bootstrapPromptedRoots.add(root);
    if (bootstrapState.status === "noncanonical") {
      void vscode.window.showWarningMessage(
        `This repository already has a non-canonical or malformed logics/skills setup. ${bootstrapState.reason} Use Check Environment for repair guidance.`
      );
      return;
    }

    const message =
      bootstrapState.promptMessage ??
      "No logics/ folder found. Bootstrap Logics by adding the cdx-logics-kit submodule?";

    const choice = await vscode.window.showInformationMessage(
      message,
      "Bootstrap Logics",
      "Not now"
    );
    if (choice !== "Bootstrap Logics") {
      return;
    }
    await this.bootstrapLogics(root);
  }

  private clearCodexRemediationPromptState(root: string): void {
    const prefix = `${root}::`;
    for (const key of Array.from(this.codexRemediationPromptedKeys)) {
      if (key.startsWith(prefix)) {
        this.codexRemediationPromptedKeys.delete(key);
      }
    }
  }

  private async inspectGlobalCodexKitPublishability(root: string): Promise<{
    inspectionOk: boolean;
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>;
    shouldPublish: boolean;
  }> {
    const inspection = inspectLogicsKitSubmodule(root);
    if (!inspection.exists || !inspection.isCanonical) {
      return {
        inspectionOk: false,
        snapshot: await inspectLogicsEnvironment(root),
        shouldPublish: false
      };
    }

    const snapshot = await inspectLogicsEnvironment(root);
    return {
      inspectionOk: true,
      snapshot,
      shouldPublish: shouldPublishRepoKit(root, snapshot.codexOverlay)
    };
  }

  private async ensureGlobalCodexKit(root: string): Promise<boolean> {
    const publishability = await this.inspectGlobalCodexKitPublishability(root);
    if (!publishability.inspectionOk || !publishability.shouldPublish) {
      return false;
    }

    try {
      publishCodexWorkspaceOverlay(root);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const key = `${root}::global-kit-autopublish-failed`;
      if (!this.codexRemediationPromptedKeys.has(key)) {
        this.codexRemediationPromptedKeys.add(key);
        void vscode.window.showWarningMessage(`Automatic global Codex kit publish failed: ${message}`);
      }
      return false;
    }
  }

  private async attemptBootstrapGlobalKitConvergence(root: string): Promise<{
    attempted: boolean;
    published: boolean;
    failed: boolean;
    failureMessage?: string;
  }> {
    const publishability = await this.inspectGlobalCodexKitPublishability(root);
    if (!publishability.inspectionOk || !publishability.shouldPublish) {
      return {
        attempted: false,
        published: false,
        failed: false
      };
    }

    try {
      publishCodexWorkspaceOverlay(root);
      return {
        attempted: true,
        published: true,
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

  private async maybeOfferCodexStartupRemediation(root: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (
      overlay.status === "healthy" ||
      overlay.status === "warning" ||
      overlay.status === "unavailable"
    ) {
      this.clearCodexRemediationPromptState(root);
      return;
    }

    if (overlay.status === "missing-manager") {
      const key = `${root}::missing-manager`;
      if (this.codexRemediationPromptedKeys.has(key)) {
        return;
      }
      this.codexRemediationPromptedKeys.add(key);
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
      const key = `${root}::overlay-sync`;
      if (this.codexRemediationPromptedKeys.has(key)) {
        return;
      }
      this.codexRemediationPromptedKeys.add(key);
      const published = await this.ensureGlobalCodexKit(root);
      if (published) {
        this.clearCodexRemediationPromptState(root);
        return;
      }
      void vscode.window.showWarningMessage(`Global Codex kit still needs attention. ${overlay.summary}`);
    }
  }

  private async bootstrapLogics(root: string): Promise<void> {
    const gitVersion = await runGitWithOutput(root, ["--version"]);
    if (gitVersion.error) {
      const detail = `${gitVersion.stderr}\n${gitVersion.stdout}\n${gitVersion.error.message}`.trim();
      if (isMissingGitFailureDetail(detail)) {
        void vscode.window.showErrorMessage(
          `Bootstrap Logics requires Git. ${buildMissingGitMessage()} The extension can repair repository state but cannot install system tools automatically. Use \`Logics: Check Environment\` for details. Read-only Logics browsing remains available until bootstrap completes.`
        );
        return;
      }
      void vscode.window.showErrorMessage(`Failed to run git: ${gitVersion.stderr || gitVersion.error.message}`);
      return;
    }

    const gitCheck = await runGitWithOutput(root, ["rev-parse", "--is-inside-work-tree"]);
    if (gitCheck.error || gitCheck.stdout.trim() !== "true") {
      const initChoice = await vscode.window.showWarningMessage(
        "Bootstrap requires a git repository. Initialize this folder with git now?",
        "Initialize Git and Bootstrap",
        "Cancel"
      );
      if (initChoice !== "Initialize Git and Bootstrap") {
        return;
      }

      const gitInit = await runGitWithOutput(root, ["init"]);
      if (gitInit.error) {
        void vscode.window.showErrorMessage(
          `Failed to initialize git repository: ${gitInit.stderr || gitInit.error.message}`
        );
        return;
      }
      void vscode.window.showInformationMessage("Git repository initialized.");
    }

    const beforeBootstrapStatusResult = await runGitWithOutput(root, ["status", "--porcelain"]);
    const beforeBootstrapStatus = beforeBootstrapStatusResult.error
      ? []
      : parseGitStatusEntries(beforeBootstrapStatusResult.stdout);

    const logicsDir = path.join(root, "logics");
    if (!fs.existsSync(logicsDir)) {
      fs.mkdirSync(logicsDir, { recursive: true });
    }

    const submoduleResult = await runGitWithOutput(root, [
      "submodule",
      "add",
      "https://github.com/AlexAgo83/cdx-logics-kit",
      "logics/skills"
    ]);
    if (submoduleResult.error) {
      void vscode.window.showErrorMessage(
        `Failed to add logics kit submodule: ${submoduleResult.stderr || submoduleResult.error.message}`
      );
      return;
    }

    const bootstrapScript = path.join(
      root,
      "logics",
      "skills",
      "logics-bootstrapper",
      "scripts",
      "logics_bootstrap.py"
    );
    if (fs.existsSync(bootstrapScript)) {
      const result = await runPythonWithOutput(root, bootstrapScript, []);
      if (result.error) {
        const detail = `${result.stderr}\n${result.stdout}\n${result.error.message}`.trim();
        if (isMissingPythonFailureDetail(detail)) {
          void vscode.window.showErrorMessage(
            `Bootstrap Logics requires Python 3. ${buildMissingPythonMessage()} The extension can repair repository state but cannot install system tools automatically. Use \`Logics: Check Environment\` for details. Read-only Logics browsing remains available until bootstrap completes.`
          );
          return;
        }
        void vscode.window.showErrorMessage(`Bootstrap script failed: ${result.stderr || result.error.message}`);
        return;
      }
    }

    await this.maybeOfferBootstrapCommit(root, beforeBootstrapStatus);
    const globalKitOutcome = await this.attemptBootstrapGlobalKitConvergence(root);
    await this.notifyBootstrapCompletion(root, globalKitOutcome);
    await this.refresh();
  }

  private async maybeOfferBootstrapCommit(root: string, beforeBootstrapStatus: ReturnType<typeof parseGitStatusEntries>): Promise<void> {
    if (beforeBootstrapStatus.length > 0) {
      void vscode.window.showInformationMessage(
        "Bootstrap completed. Commit proposal skipped because the repository already had uncommitted changes."
      );
      return;
    }

    const afterBootstrapStatusResult = await runGitWithOutput(root, ["status", "--porcelain"]);
    if (afterBootstrapStatusResult.error) {
      return;
    }

    const afterBootstrapStatus = parseGitStatusEntries(afterBootstrapStatusResult.stdout);
    const bootstrapPaths = Array.from(
      new Set(afterBootstrapStatus.map((entry) => entry.path).filter((entry) => isBootstrapScopedPath(entry)))
    ).sort((left, right) => left.localeCompare(right));

    if (bootstrapPaths.length === 0) {
      return;
    }

    const commitMessage = buildBootstrapCommitMessage(bootstrapPaths);
    const action = await vscode.window.showInformationMessage(
      `Bootstrap completed. Create commit now with message: "${commitMessage}"?`,
      "Commit Bootstrap Changes",
      "Not now"
    );
    if (action !== "Commit Bootstrap Changes") {
      return;
    }

    const addResult = await runGitWithOutput(root, ["add", "-A", "--", ...bootstrapPaths]);
    if (addResult.error) {
      void vscode.window.showErrorMessage(`Failed to stage bootstrap changes: ${addResult.stderr || addResult.error.message}`);
      return;
    }

    const commitResult = await runGitWithOutput(root, ["commit", "-m", commitMessage]);
    if (commitResult.error) {
      const detail = `${commitResult.stderr}\n${commitResult.stdout}`.trim();
      if (/nothing to commit/i.test(detail)) {
        void vscode.window.showInformationMessage("Bootstrap changes were already clean; nothing to commit.");
        return;
      }
      void vscode.window.showErrorMessage(`Failed to create bootstrap commit: ${detail || commitResult.error.message}`);
      return;
    }

    void vscode.window.showInformationMessage(`Created bootstrap commit: ${commitMessage}`);
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
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning") {
      const detail = globalKitOutcome?.published ? " Global Codex kit publication completed during bootstrap." : "";
      void vscode.window.showInformationMessage(`Logics bootstrapped. Repo-local kit and the global Codex kit are ready.${detail} Refreshing.`);
      return;
    }
    const actions: string[] = [];
    if (overlay.status === "missing-manager") {
      actions.push("Update Logics Kit");
    }
    if (overlay.status !== "missing-manager") {
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

  private async maybeShowCodexOverlayHandoff(root: string, trigger: string): Promise<void> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning") {
      if (!overlay.runCommand) {
        return;
      }
      const launchAction = "Launch Codex in Terminal";
      const copyAction = "Copy Codex Launch Command";
      const choice = await vscode.window.showInformationMessage(
        `Global Codex kit is ready after ${trigger}. Launch Codex normally to use the published Logics skills.`,
        launchAction,
        copyAction
      );
      if (choice === launchAction) {
        this.launchCodexOverlayTerminal(root, overlay.runCommand);
        return;
      }
      if (choice === copyAction) {
        await vscode.env.clipboard.writeText(overlay.runCommand);
        void vscode.window.showInformationMessage("Codex launch command copied to clipboard.");
      }
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

    const actions: string[] = [];
    actions.push("Publish Global Codex Kit");
    const choice = await vscode.window.showInformationMessage(
      `Repo-local Logics is ready after ${trigger}, but the global Codex kit still needs publication or repair. ${overlay.summary}`,
      ...actions
    );
    if (choice === "Publish Global Codex Kit") {
      await this.syncCodexOverlay(root, trigger);
    }
  }

  private async updateLogicsKit(root: string, trigger: string): Promise<boolean> {
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
    await this.refresh();
    const snapshot = await inspectLogicsEnvironment(root);

    if (snapshot.codexOverlay.status === "missing-manager") {
      void vscode.window.showWarningMessage(
        updated
          ? "The Logics kit submodule updated, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
          : "The Logics kit is already at the current tracked submodule revision, but it still does not expose a compatible global publication source. Check whether the repository is pinned to an older kit branch or tag."
      );
      return true;
    }

    const actions: string[] = [];
    if (snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning") {
      actions.push("Publish Global Codex Kit");
    }
    const message = updated
      ? `Logics kit updated after ${trigger}. Review and commit the submodule pointer change in your repository when ready.`
      : "The Logics kit is already up to date on the tracked submodule revision.";
    const choice = actions.length > 0 ? await vscode.window.showInformationMessage(message, ...actions) : undefined;
    if (choice === "Publish Global Codex Kit") {
      await this.syncCodexOverlay(root, "kit update");
    } else {
      void vscode.window.showInformationMessage(message);
    }
    return true;
  }

  private async syncCodexOverlay(
    root: string,
    trigger: string,
    options?: {
      autoLaunchOnSuccess?: boolean;
    }
  ): Promise<boolean> {
    const snapshot = await inspectLogicsEnvironment(root);
    const overlay = snapshot.codexOverlay;
    if (overlay.status === "healthy" || overlay.status === "warning") {
      if (options?.autoLaunchOnSuccess && overlay.runCommand) {
        this.launchCodexOverlayTerminal(root, overlay.runCommand);
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

    await this.refresh();
    const refreshed = await inspectLogicsEnvironment(root);
    if (refreshed.codexOverlay.status === "healthy" || refreshed.codexOverlay.status === "warning") {
      if (options?.autoLaunchOnSuccess && refreshed.codexOverlay.runCommand) {
        this.launchCodexOverlayTerminal(root, refreshed.codexOverlay.runCommand);
        void vscode.window.showInformationMessage(`Global Codex kit published after ${trigger}. Launching Codex in Terminal.`);
        return true;
      }
      const actions: string[] = [];
      if (refreshed.codexOverlay.runCommand) {
        actions.push("Launch Codex in Terminal", "Copy Codex Launch Command");
      }
      const choice = actions.length > 0
        ? await vscode.window.showInformationMessage(
            `Global Codex kit published after ${trigger}. ${refreshed.codexOverlay.summary}`,
            ...actions
          )
        : undefined;
      if (choice === "Launch Codex in Terminal" && refreshed.codexOverlay.runCommand) {
        this.launchCodexOverlayTerminal(root, refreshed.codexOverlay.runCommand);
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

  private launchCodexOverlayTerminal(root: string, runCommand: string): void {
    const terminal = vscode.window.createTerminal({
      name: `Codex: ${path.basename(root)}`,
      cwd: root
    });
    terminal.show(true);
    terminal.sendText(runCommand, true);
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

  private getHybridInsightsPanel(): vscode.WebviewPanel {
    if (this.hybridInsightsPanel) {
      return this.hybridInsightsPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "logics.hybridInsights",
      "Hybrid Assist Insights",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    panel.webview.onDidReceiveMessage(async (message) => {
      const root = await this.getActionRoot();
      if (!root) {
        return;
      }
      if (message?.type === "refresh-report") {
        await this.refreshHybridInsightsPanel(root);
        return;
      }
      if (message?.type === "open-source-log" && (message.source === "audit" || message.source === "measurement")) {
        await this.openHybridInsightsSourceLog(root, message.source);
      }
    });

    panel.onDidDispose(() => {
      if (this.hybridInsightsPanel === panel) {
        this.hybridInsightsPanel = undefined;
      }
    });

    this.hybridInsightsPanel = panel;
    return panel;
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
