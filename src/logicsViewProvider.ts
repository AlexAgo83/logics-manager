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
import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "./logicsEnvironment";
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
import { buildOnboardingHtml } from "./logicsOnboardingHtml";
import { inspectGitHubReleaseCapability } from "./releasePublishSupport";
import { inspectReleaseBranchFastForwardConsent } from "./releaseBranchConsent";
import { inspectRuntimeLaunchers } from "./runtimeLaunchers";

const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const ONBOARDING_LAST_VERSION_KEY = "logics.onboardingLastVersion";
const STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX = "logics.startupKitUpdatePrompt";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";
const MIN_LOGICS_KIT_MAJOR = 1;
const MIN_LOGICS_KIT_MINOR = 7;

export class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private projectRootOverride: string | null;
  private invalidRootNotice?: string;
  private activeAgentId: string | null;
  private agentRegistry: AgentRegistrySnapshot = createEmptyAgentRegistry();
  private readPreviewPanel?: vscode.WebviewPanel;
  private onboardingPanel?: vscode.WebviewPanel;
  private readonly documentController: LogicsViewDocumentController;
  private readonly hybridAssistController: LogicsHybridAssistController;
  private readonly codexWorkflowController: LogicsCodexWorkflowController;
  private readonly environmentOutput: vscode.OutputChannel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onProjectRootChanged: () => void,
    private readonly agentsOutput: vscode.OutputChannel,
    environmentOutput?: vscode.OutputChannel
  ) {
    const storedOverride = this.context.workspaceState.get<string>(ROOT_OVERRIDE_STATE_KEY);
    this.projectRootOverride = storedOverride?.trim() || null;
    const storedAgentId = this.context.workspaceState.get<string>(ACTIVE_AGENT_STATE_KEY);
    this.activeAgentId = storedAgentId?.trim() || null;
    this.environmentOutput = environmentOutput ?? agentsOutput;
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
        case "launch-claude":
          await this.launchClaudeFromTools();
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
        case "repair-logics-kit":
          await this.repairLogicsKitFromTools();
          return;
        case "assist-commit-all":
          await this.commitAllChangesFromTools();
          return;
        case "assist-next-step":
          await this.suggestNextStepFromTools();
          return;
        case "assist-triage":
          await this.triageWorkflowDocFromTools(message.id);
          return;
        case "assist-diff-risk":
          await this.assessDiffRiskFromTools();
          return;
        case "assist-summarize-validation":
          await this.summarizeValidationFromTools();
          return;
        case "assist-summarize-changelog":
          await this.summarizeChangelogFromTools();
          return;
        case "assist-prepare-release":
          await this.prepareReleaseFromTools();
          return;
        case "assist-publish-release":
          await this.publishReleaseFromTools();
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
        case "open-onboarding":
          this.openOnboardingPanel();
          return;
        case "tool-action":
          if (message.action) {
            await this.view?.webview.postMessage({ type: "trigger-tool-action", action: message.action });
          }
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
        canLaunchCodex: false,
        launchCodexTitle: "Select a project root first",
        canLaunchClaude: false,
        launchClaudeTitle: "Select a project root first",
        canRepairLogicsKit: false,
        repairLogicsKitTitle: "Select a project root first",
        canPublishRelease: false,
        publishReleaseTitle: "Select a project root first",
        shouldRecommendCheckEnvironment: true,
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
        canLaunchCodex: false,
        launchCodexTitle: "This branch does not have a logics/ folder yet",
        canLaunchClaude: false,
        launchClaudeTitle: "This branch does not have a logics/ folder yet",
        canRepairLogicsKit: true,
        repairLogicsKitTitle: "Bootstrap or repair Logics in this branch first.",
        canPublishRelease: false,
        publishReleaseTitle: "Publish Release requires a bootstrapped Logics project.",
        shouldRecommendCheckEnvironment: true,
        error: `This branch does not have a logics/ folder in: ${root}.`
      });
      await this.maybeOfferBootstrap(root);
      return;
    }

    this.items = indexLogics(root);
    await this.refreshAgents("silent", root);
    const [changedPaths, launchers, environmentSnapshot, publishReleaseCapability] = await Promise.all([
      this.getGitChangedPaths(root),
      inspectRuntimeLaunchers(root),
      inspectLogicsEnvironment(root),
      inspectGitHubReleaseCapability(root)
    ]);
    const shouldRecommendCheckEnvironment = await this.shouldRecommendCheckEnvironment(
      root,
      environmentSnapshot,
      bootstrapState
    );
    this.postData({
      items: this.items,
      root,
      selectedId,
      canBootstrapLogics,
      bootstrapLogicsTitle: bootstrapState?.actionTitle,
      canResetProjectRoot,
      canLaunchCodex: launchers.codex.available,
      launchCodexTitle: launchers.codex.title,
      canLaunchClaude: launchers.claude.available,
      launchClaudeTitle: launchers.claude.title,
      canRepairLogicsKit: true,
      repairLogicsKitTitle: "Check current Logics runtime state and repair the shared kit publication or bridge files.",
      canPublishRelease: publishReleaseCapability.available,
      publishReleaseTitle: publishReleaseCapability.title,
      shouldRecommendCheckEnvironment,
      activeAgentId: this.activeAgentId ?? undefined,
      activeAgent: this.getActiveAgentPayload(),
      changedPaths
    });
    const startupKitPromptShown = await this.maybeOfferStartupKitUpdate(root, bootstrapState);
    if (!startupKitPromptShown) {
      const bootstrapTriggered = await this.maybeOfferBootstrap(root);
      if (bootstrapTriggered || this.codexWorkflowController.isBootstrapInProgress(root)) {
        this.maybeShowOnboarding();
        return;
      }
      await this.codexWorkflowController.ensureGlobalCodexKit(root);
      await this.maybeOfferCodexStartupRemediation(root);
    }
    this.maybeShowOnboarding();
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
    await this.refresh();
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

  openOnboardingFromCommand(): void {
    this.openOnboardingPanel();
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

  private async launchClaudeFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchClaudeFromTools(root);
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
    if (bootstrapState.status === "canonical" && !bootstrapState.canBootstrap) {
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
    const publishReleaseCapability = root
      ? await inspectGitHubReleaseCapability(root)
      : {
          available: false,
          title: "Select a project root first"
        };
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
    const claudeGlobalKit = snapshot.claudeGlobalKit ?? {
      status: "missing-overlay",
      summary: "Global Claude Logics kit has not been published yet.",
      issues: [],
      warnings: []
    };
    const hybridCapability = snapshot.capabilities.hybridAssist ?? {
      status: "unavailable",
      summary: "Hybrid assist capability is unavailable."
    };
    const claudeGlobalKitNeedsAttention = claudeGlobalKit.status !== "healthy";
    const recommendedActions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }> = [];
    const statusItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }> = [];
    const detailItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }> = [];

    if (root) {
      const kitVersionItem = this.buildKitVersionQuickPickItem(root);
      if (kitVersionItem) {
        recommendedActions.push({
          ...kitVersionItem,
          label: kitVersionItem.label.replace(/^Run:\s*/, "Fix now: ")
        });
      }
    }

    if (root && (snapshot.codexOverlay.status === "missing-manager" || claudeGlobalKit.status === "missing-manager")) {
      recommendedActions.push({
        label: "Fix now: Update Logics Kit",
        description: "Local kit is missing required manager support, so runtime publication and repair cannot complete cleanly yet.",
        action: async () => {
          await this.codexWorkflowController.updateLogicsKit(root, "environment diagnostics");
        }
      });
    }

    if (root) {
      const bootstrapState = inspectLogicsBootstrapState(root);
      if (bootstrapState.canBootstrap) {
        recommendedActions.push({
          label: `Fix now: ${bootstrapState.actionTitle}`,
          description: `${bootstrapState.reason} This is the main repair path for the current repository state.`,
          action: async () => {
            await this.codexWorkflowController.bootstrapLogics(root);
          }
        });
      }
    }

    if (root) {
      const providerItem = await this.hybridAssistController.buildProviderRemediationQuickPickItem(root);
      if (providerItem) {
        recommendedActions.push(providerItem);
      }
    }

    if (root) {
      const yamlItem = this.buildLogicsYamlBlocksQuickPickItem(root);
      if (yamlItem) {
        recommendedActions.push(yamlItem);
      }
    }

    if (root) {
      const gitignoreItem = await this.buildGitignoreArtifactsQuickPickItem(root);
      if (gitignoreItem) {
        detailItems.push(gitignoreItem);
      }
    }

    if (root) {
      const envLocalItem = this.buildMissingEnvLocalQuickPickItem(root);
      if (envLocalItem) {
        recommendedActions.push(envLocalItem);
      }
    }

    if (
      root &&
      snapshot.codexOverlay.status !== "healthy" &&
      snapshot.codexOverlay.status !== "warning" &&
      snapshot.codexOverlay.status !== "missing-manager"
    ) {
      recommendedActions.push({
        label: "Fix now: Publish Global Codex Kit",
        description: "Codex-specific runtime support needs repair before direct Codex launch can be trusted from this repository.",
        action: async () => {
          await this.codexWorkflowController.syncCodexOverlay(root, "environment diagnostics");
        }
      });
    }

    if (root && claudeGlobalKitNeedsAttention && claudeGlobalKit.status !== "missing-manager") {
      recommendedActions.push({
        label: "Fix now: Publish Global Claude Kit",
        description: "Claude launch readiness depends on a healthy global Claude Logics kit, not only repo-local bridge files.",
        action: async () => {
          await this.codexWorkflowController.syncClaudeGlobalKit(root, "environment diagnostics");
        }
      });
    }

    statusItems.push(
      {
        label: `Environment: ${this.getEnvironmentOverallState(snapshot, hybridRuntime, recommendedActions)}`,
        description: this.getEnvironmentSummaryDescription(snapshot, hybridRuntime, recommendedActions)
      },
      {
        label: `Workspace: ${snapshot.root ? "Selected" : "Missing"}`,
        description: snapshot.root
          ? `${snapshot.root} — repository state: ${snapshot.repositoryState}`
          : "No project root is currently selected."
      },
      {
        label: `Global Codex kit: ${snapshot.codexOverlay.status === "healthy" ? "Ready" : snapshot.codexOverlay.status === "warning" ? "Ready with warnings" : "Needs attention"}`,
        description: snapshot.codexOverlay.summary
      },
      {
        label: `Global Claude kit: ${claudeGlobalKit.status === "healthy" ? "Ready" : "Needs attention"}`,
        description: claudeGlobalKit.summary
      },
      {
        label: `Read-only browsing: ${snapshot.capabilities.readOnly.status === "available" ? "Available" : "Blocked"}`,
        description: snapshot.capabilities.readOnly.summary
      },
      {
        label: `Workflow editing: ${snapshot.capabilities.workflowMutation.status === "available" ? "Available" : "Blocked"}`,
        description: snapshot.capabilities.workflowMutation.summary
      },
      {
        label: `Bootstrap and repair: ${snapshot.capabilities.bootstrapRepair.status === "available" ? "Available" : "Blocked"}`,
        description: snapshot.capabilities.bootstrapRepair.summary
      },
      {
        label: `Codex runtime: ${snapshot.capabilities.codexRuntime.status === "available" ? "Available" : "Unavailable"}`,
        description: snapshot.capabilities.codexRuntime.summary
      },
      {
        label: `AI assistant runtime: ${hybridRuntime.state === "ready" ? "Ready" : hybridRuntime.state === "degraded" ? "Degraded" : "Blocked"}`,
        description: hybridRuntime.summary
      },
      {
        label: `AI assistant workflows: ${hybridCapability.status === "available" ? "Available" : "Unavailable"}`,
        description: hybridCapability.summary
      },
      {
        label: `Claude repo bridge: ${hybridRuntime.claudeBridgeAvailable ? "Available" : "Missing"}`,
        description: hybridRuntime.claudeBridgeAvailable
          ? "Claude bridge files point to the shared hybrid runtime."
          : "Hybrid runtime stays usable, but the thin Claude bridge is missing."
      },
      {
        label: `Publish Release: ${publishReleaseCapability.available ? "Available" : "Unavailable"}`,
        description: publishReleaseCapability.title
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

    if (root) {
      this.ensureLogicsCacheDir(root);
    }

    if (root && !hybridRuntime.claudeBridgeAvailable) {
      const bridgeStatus = detectClaudeBridgeStatus(root);
      const missingFiles = bridgeStatus.supportedVariants
        .flatMap((variant) => {
          const v = ["hybrid-assist", "flow-manager"].find((id) => id === variant);
          if (!v) return [];
          const commandFile = path.join(root, ".claude", "commands", v === "hybrid-assist" ? "logics-assist.md" : "logics-flow.md");
          const agentFile = path.join(root, ".claude", "agents", v === "hybrid-assist" ? "logics-hybrid-delivery-assistant.md" : "logics-flow-manager.md");
          const missing: string[] = [];
          if (!fs.existsSync(commandFile)) missing.push(path.relative(root, commandFile));
          if (!fs.existsSync(agentFile)) missing.push(path.relative(root, agentFile));
          return missing;
        });
      recommendedActions.push({
        label: "Fix now: Repair Logics Kit",
        description: missingFiles.length > 0
          ? `Claude bridge files are missing: ${missingFiles.join(", ")}`
          : "Bridge files are incomplete — run the repair flow to restore shared runtime wiring.",
        action: async () => {
          await this.codexWorkflowController.repairLogicsKit(root);
        }
      });
    }

    if (snapshot.missingWorkflowDirs.length > 0) {
      statusItems.push({
        label: "Workflow folders: Incomplete but recoverable",
        description: `Missing directories: ${snapshot.missingWorkflowDirs.join(", ")}. Create flows will recreate them automatically.`
      });
    }

    if (snapshot.codexOverlay.installedVersion) {
      detailItems.push({
        label: "Global Codex kit version",
        description: snapshot.codexOverlay.installedVersion
      });
    }

    if (snapshot.codexOverlay.sourceRepo) {
      detailItems.push({
        label: "Global Codex kit source",
        description: snapshot.codexOverlay.sourceRepo
      });
    }

    if (claudeGlobalKit.installedVersion) {
      detailItems.push({
        label: "Global Claude kit version",
        description: claudeGlobalKit.installedVersion
      });
    }

    if (claudeGlobalKit.sourceRepo) {
      detailItems.push({
        label: "Global Claude kit source",
        description: claudeGlobalKit.sourceRepo
      });
    }

    if (snapshot.codexOverlay.runCommand) {
      detailItems.push({
        label: "Codex launch command",
        description: snapshot.codexOverlay.runCommand
      });
    }

    if (root) {
      const releaseConsent = inspectReleaseBranchFastForwardConsent(root);
      detailItems.push({
        label: `Release branch fast-forward consent: ${releaseConsent.allowed ? "Granted" : releaseConsent.available ? "Not granted" : "Unavailable"}`,
        description: releaseConsent.title
      });
    }

    detailItems.push({
      label: "Hybrid runtime entrypoint",
      description: hybridRuntime.windowsSafeEntrypoint
    });

    for (const issue of snapshot.codexOverlay.issues.slice(0, 3)) {
      detailItems.push({
        label: "Global Codex kit note",
        description: issue
      });
    }

    for (const issue of claudeGlobalKit.issues.slice(0, 3)) {
      detailItems.push({
        label: "Global Claude kit note",
        description: issue
      });
    }

    for (const reason of hybridRuntime.degradedReasons.slice(0, 3)) {
      detailItems.push({
        label: "Runtime note",
        description: reason
      });
    }

    detailItems.push({
      label: "Open detailed diagnostic report",
      description: "Show the full environment breakdown in the Logics Environment output.",
      action: async () => {
        this.writeEnvironmentDiagnosticReport(root, snapshot, recommendedActions, statusItems, detailItems);
        void vscode.window.showInformationMessage("Detailed environment report written to the Logics Environment output.");
      }
    });

    const quickPickItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }> = [];
    quickPickItems.push({ label: "Summary", kind: vscode.QuickPickItemKind.Separator });
    quickPickItems.push(...statusItems.slice(0, 1));
    if (recommendedActions.length > 0) {
      quickPickItems.push({ label: "Recommended actions", kind: vscode.QuickPickItemKind.Separator });
      quickPickItems.push(...recommendedActions);
    }
    quickPickItems.push({ label: "Current status", kind: vscode.QuickPickItemKind.Separator });
    quickPickItems.push(...statusItems.slice(1));
    if (detailItems.length > 0) {
      quickPickItems.push({ label: "Technical details", kind: vscode.QuickPickItemKind.Separator });
      quickPickItems.push(...detailItems);
    }

    const choice = await vscode.window.showQuickPick(quickPickItems, {
      title: "Logics: Check Environment",
      placeHolder:
        recommendedActions.length > 0
          ? "Select a recommended fix or review current status"
          : "No immediate fix is required — review current status or open the detailed report",
      ignoreFocusOut: true
    });
    if (choice?.action) {
      await choice.action();
    }
  }

  private async shouldRecommendCheckEnvironment(
    root: string,
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>,
    bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null
  ): Promise<boolean> {
    if (bootstrapState?.canBootstrap) {
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

  private getEnvironmentOverallState(
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>,
    hybridRuntime: NonNullable<Awaited<ReturnType<typeof inspectLogicsEnvironment>>["hybridRuntime"]>,
    actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>
  ): "Blocked" | "Degraded" | "Healthy" {
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

  private getEnvironmentSummaryDescription(
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>,
    hybridRuntime: NonNullable<Awaited<ReturnType<typeof inspectLogicsEnvironment>>["hybridRuntime"]>,
    actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>
  ): string {
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

  private writeEnvironmentDiagnosticReport(
    root: string | null,
    snapshot: Awaited<ReturnType<typeof inspectLogicsEnvironment>>,
    recommendedActions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
    statusItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
    detailItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>
  ): void {
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

  private ensureLogicsCacheDir(root: string): void {
    const cacheDir = path.join(root, "logics", ".cache");
    if (!fs.existsSync(cacheDir)) {
      try {
        fs.mkdirSync(cacheDir, { recursive: true });
      } catch {
        // non-blocking — runtime will surface errors if it can't write there
      }
    }
  }

  private buildMissingEnvLocalQuickPickItem(
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
    const missingTargets = targetFiles.filter((fileName) => {
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

  private getRepositoryEnvFiles(root: string): string[] {
    try {
      return fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.startsWith(".env"))
        .map((entry) => entry.name)
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

  private async buildGitignoreArtifactsQuickPickItem(
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

  private maybeShowOnboarding(): void {
    const extensionVersion =
      (this.context.extension?.packageJSON as { version?: string } | undefined)?.version ?? null;
    const lastSeen = this.context.globalState.get<string>(ONBOARDING_LAST_VERSION_KEY) ?? null;
    if (lastSeen === extensionVersion) {
      return;
    }
    void this.context.globalState.update(ONBOARDING_LAST_VERSION_KEY, extensionVersion);
    this.openOnboardingPanel();
  }

  private openOnboardingPanel(): void {
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

  private buildKitVersionQuickPickItem(
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

  private inspectKitUpdateNeed(root: string): { currentVersion: string; minimumVersion: string; signature: string } | null {
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

  private async checkHybridRuntimeFromTools(): Promise<void> {
    await this.hybridAssistController.checkHybridRuntimeFromTools();
  }

  private async commitAllChangesFromTools(): Promise<void> {
    await this.hybridAssistController.commitAllChangesFromTools();
  }

  private async suggestNextStepFromTools(): Promise<void> {
    await this.hybridAssistController.suggestNextStepFromTools();
  }

  private async triageWorkflowDocFromTools(preferredId?: string): Promise<void> {
    await this.hybridAssistController.triageWorkflowDocFromTools(preferredId);
  }

  private async assessDiffRiskFromTools(): Promise<void> {
    await this.hybridAssistController.assessDiffRiskFromTools();
  }

  private async summarizeValidationFromTools(): Promise<void> {
    await this.hybridAssistController.summarizeValidationFromTools();
  }

  private async summarizeChangelogFromTools(): Promise<void> {
    await this.hybridAssistController.summarizeChangelogFromTools();
  }

  private async prepareReleaseFromTools(): Promise<void> {
    await this.hybridAssistController.prepareReleaseFromTools();
  }

  private async publishReleaseFromTools(): Promise<void> {
    await this.hybridAssistController.publishReleaseFromTools();
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

  private async repairLogicsKitFromTools(): Promise<void> {
    const root = await this.getActionRoot();
    if (!root) {
      return;
    }
    await this.codexWorkflowController.repairLogicsKit(root);
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

  private async injectAgentPromptIntoCodexChat(agent: AgentDefinition): Promise<void> {
    await this.injectPromptIntoCodexChat(agent.defaultPrompt, {
      codexCopiedMessage: "Agent prompt copied to clipboard for your assistant. Paste it into your assistant session.",
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
        ? "Context pack copied to clipboard. Open a new assistant session, then paste it."
        : "Context pack copied to clipboard for your assistant. Paste it into your assistant session."),
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

  private async maybeOfferBootstrap(root: string): Promise<boolean> {
    return this.codexWorkflowController.maybeOfferBootstrap(root);
  }

  private async maybeOfferStartupKitUpdate(
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
    const lastPromptSignature = this.context.globalState.get<string>(promptKey) ?? null;
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

  private getStartupKitUpdatePromptStateKey(root: string): string {
    return `${STARTUP_KIT_UPDATE_PROMPT_STATE_PREFIX}:${path.resolve(root)}`;
  }

  private async clearStartupKitUpdatePromptState(root: string): Promise<void> {
    await this.context.globalState.update(this.getStartupKitUpdatePromptStateKey(root), undefined);
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
