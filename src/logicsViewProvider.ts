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
  detectDangerousGitignorePatterns,
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
import { LogicsCorpusInsightsController } from "./logicsCorpusInsightsController";
import { LogicsCodexWorkflowController } from "./logicsCodexWorkflowController";
import { assertNever, parseLogicsWebviewMessage } from "./logicsViewMessages";
import { buildOnboardingHtml } from "./logicsOnboardingHtml";
import { inspectGitHubReleaseCapability } from "./releasePublishSupport";
import { inspectReleaseBranchFastForwardConsent } from "./releaseBranchConsent";
import { inspectRuntimeLaunchers, RuntimeLaunchersSnapshot } from "./runtimeLaunchers";
import { ReleasePublishCapability } from "./releasePublishSupport";
import { LogicsEnvironmentSnapshot } from "./logicsEnvironment";
import * as viewProviderSupport from "./logicsViewProviderSupport";

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
  private readonly logicsCorpusInsightsController: LogicsCorpusInsightsController;
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
      getActionRoot: () => viewProviderSupport.getActionRoot.call(this),
      getItems: () => this.items,
      pickItem: (items, placeHolder) => viewProviderSupport.pickItem.call(this, items, placeHolder),
      refresh: () => this.refresh()
    });
    this.logicsCorpusInsightsController = new LogicsCorpusInsightsController({
      context: this.context,
      getActionRoot: () => viewProviderSupport.getActionRoot.call(this),
      getItems: () => this.items,
      refresh: () => this.refresh(),
      openOnboarding: async () => {
        viewProviderSupport.openOnboardingPanel.call(this);
      },
      openAbout: () => viewProviderSupport.openAbout.call(this)
    });
    this.codexWorkflowController = new LogicsCodexWorkflowController({
      refresh: () => this.refresh()
    });
    this.documentController = new LogicsViewDocumentController({
      context: this.context,
      agentsOutput: this.agentsOutput,
      getItems: () => this.items,
      getAgentRegistry: () => this.agentRegistry,
      getActionRoot: () => viewProviderSupport.getActionRoot.call(this),
      maybeOfferBootstrap: (root) => viewProviderSupport.maybeOfferBootstrap.call(this, root),
      maybeShowCodexOverlayHandoff: (root, trigger) => viewProviderSupport.maybeShowCodexOverlayHandoff.call(this, root, trigger),
      refresh: (selectedId) => this.refresh(selectedId),
      refreshAgents: (mode, root) => viewProviderSupport.refreshAgents.call(this, mode, root),
      findRequestAuthoringAgent: () => viewProviderSupport.findRequestAuthoringAgent.call(this),
      setActiveAgent: (agentId) => viewProviderSupport.setActiveAgent.call(this, agentId),
      injectPromptIntoCodexChat: (prompt, options) => viewProviderSupport.injectPromptIntoCodexChat.call(this, prompt, options),
      getReadPreviewPanel: () => viewProviderSupport.getReadPreviewPanel.call(this)
    });

    Object.assign(this, {
      assessDiffRiskFromTools: () => viewProviderSupport.assessDiffRiskFromTools.call(this),
      buildLogicsYamlBlocksQuickPickItem: (root: string) =>
        viewProviderSupport.buildLogicsYamlBlocksQuickPickItem.call(this, root),
      buildValidationChecklistFromTools: () => viewProviderSupport.buildValidationChecklistFromTools.call(this),
      buildMissingEnvLocalQuickPickItem: (root: string) =>
        viewProviderSupport.buildMissingEnvLocalQuickPickItem.call(this, root),
      canResetProjectRoot: () => viewProviderSupport.canResetProjectRoot.call(this),
      checkHybridRuntimeFromTools: () => viewProviderSupport.checkHybridRuntimeFromTools.call(this),
      clearAgentRegistry: () => viewProviderSupport.clearAgentRegistry.call(this),
      clearStartupKitUpdatePromptState: (root: string) =>
        viewProviderSupport.clearStartupKitUpdatePromptState.call(this, root),
      commitAllChangesFromTools: () => viewProviderSupport.commitAllChangesFromTools.call(this),
      bootstrapLogics: (root: string) => viewProviderSupport.bootstrapLogics.call(this, root),
      getActionRoot: () => viewProviderSupport.getActionRoot.call(this),
      getActiveAgentPayload: () => viewProviderSupport.getActiveAgentPayload.call(this),
      getRepositoryEnvFiles: (root: string) => viewProviderSupport.getRepositoryEnvFiles.call(this, root),
      getStartupKitUpdatePromptStateKey: (root: string) =>
        viewProviderSupport.getStartupKitUpdatePromptStateKey.call(this, root),
      inspectKitUpdateNeed: (root: string) => viewProviderSupport.inspectKitUpdateNeed.call(this, root),
      injectPromptIntoCodexChat: (prompt: string, options?: { preferNewThread?: boolean }) =>
        viewProviderSupport.injectPromptIntoCodexChat.call(this, prompt, options),
      injectAgentPromptIntoCodexChat: (agent: AgentDefinition) =>
        viewProviderSupport.injectAgentPromptIntoCodexChat.call(this, agent),
      maybeOfferBootstrap: (root: string) => viewProviderSupport.maybeOfferBootstrap.call(this, root),
      maybeOfferCodexStartupRemediation: (root: string) =>
        viewProviderSupport.maybeOfferCodexStartupRemediation.call(this, root),
      maybeOfferStartupKitUpdate: (root: string, bootstrapState: any) =>
        viewProviderSupport.maybeOfferStartupKitUpdate.call(this, root, bootstrapState),
      maybeShowOnboarding: (root: string) => viewProviderSupport.maybeShowOnboarding.call(this, root),
      maybeShowCodexOverlayHandoff: (root: string, trigger: string) =>
        viewProviderSupport.maybeShowCodexOverlayHandoff.call(this, root, trigger),
      notifyInvalidRootOverride: (invalidOverridePath: string | undefined, hasValidRoot: boolean) =>
        viewProviderSupport.notifyInvalidRootOverride.call(this, invalidOverridePath, hasValidRoot),
      openOnboardingPanel: () => viewProviderSupport.openOnboardingPanel.call(this),
      openHybridInsightsFromTools: () => viewProviderSupport.openHybridInsightsFromTools.call(this),
      openLogicsInsightsFromTools: () => viewProviderSupport.openLogicsInsightsFromTools.call(this),
      notifyBootstrapCompletion: (
        root: string,
        globalKitOutcome?: {
          attempted: boolean;
          published: boolean;
          failed: boolean;
          failureMessage?: string;
        }
      ) => viewProviderSupport.notifyBootstrapCompletion.call(this, root, globalKitOutcome),
      postData: (payload: Parameters<typeof viewProviderSupport.postData>[0]) =>
        viewProviderSupport.postData.call(this, payload),
      prepareReleaseFromTools: () => viewProviderSupport.prepareReleaseFromTools.call(this),
      publishReleaseFromTools: () => viewProviderSupport.publishReleaseFromTools.call(this),
      refreshAgents: (mode: "silent" | "notify", root: string) =>
        viewProviderSupport.refreshAgents.call(this, mode, root),
      resolveProjectRoot: () => viewProviderSupport.resolveProjectRoot.call(this),
      repairLogicsKitFromTools: () => viewProviderSupport.repairLogicsKitFromTools.call(this),
      reviewDocConsistencyFromTools: () => viewProviderSupport.reviewDocConsistencyFromTools.call(this),
      shouldRecommendCheckEnvironment: (root: string, snapshot: any, bootstrapState: any) =>
        viewProviderSupport.shouldRecommendCheckEnvironment.call(this, root, snapshot, bootstrapState),
      summarizeChangelogFromTools: () => viewProviderSupport.summarizeChangelogFromTools.call(this),
      summarizeValidationFromTools: () => viewProviderSupport.summarizeValidationFromTools.call(this),
      syncCodexOverlayFromTools: () => viewProviderSupport.syncCodexOverlayFromTools.call(this),
      suggestNextStepFromTools: () => viewProviderSupport.suggestNextStepFromTools.call(this),
      triageWorkflowDocFromTools: (preferredId?: string) =>
        viewProviderSupport.triageWorkflowDocFromTools.call(this, preferredId),
      updateLogicsKitFromTools: () => viewProviderSupport.updateLogicsKitFromTools.call(this),
      updateItemLifecycle: (id: string, title: string, progress: string) =>
        viewProviderSupport.updateItemLifecycle.call(this, id, title, progress),
      writeAgentScanOutput: (
        snapshot: AgentRegistrySnapshot,
        root: string,
        shouldShowOutput: boolean
      ) => viewProviderSupport.writeAgentScanOutput.call(this, snapshot, root, shouldShowOutput)
    });
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;

    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    view.webview.html = viewProviderSupport.getHtmlForWebview.call(this, view.webview);

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
          await viewProviderSupport.openItem.call(this, message.id);
          return;
        case "read":
          await viewProviderSupport.readItem.call(this, message.id);
          return;
        case "promote":
          await viewProviderSupport.promoteItem.call(this, message.id);
          return;
        case "add-reference":
          await viewProviderSupport.addReference.call(this, message.id);
          return;
        case "add-used-by":
          await viewProviderSupport.addUsedBy.call(this, message.id);
          return;
        case "rename-entry":
          await viewProviderSupport.renameItem.call(this, message.id);
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
          await viewProviderSupport.injectPromptFromWebview.call(this, message.prompt, message.options);
          return;
        case "bootstrap-logics":
          await this.bootstrapFromTools();
          return;
        case "check-environment":
          await this.checkEnvironmentFromTools();
          return;
        case "check-hybrid-runtime":
          await viewProviderSupport.checkHybridRuntimeFromTools.call(this);
          return;
        case "update-logics-kit":
          await viewProviderSupport.updateLogicsKitFromTools.call(this);
          return;
        case "sync-codex-overlay":
          await viewProviderSupport.syncCodexOverlayFromTools.call(this);
          return;
        case "repair-logics-kit":
          await viewProviderSupport.repairLogicsKitFromTools.call(this);
          return;
        case "assist-commit-all":
          await viewProviderSupport.commitAllChangesFromTools.call(this);
          return;
        case "assist-next-step":
          await viewProviderSupport.suggestNextStepFromTools.call(this);
          return;
        case "assist-triage":
          await viewProviderSupport.triageWorkflowDocFromTools.call(this, message.id);
          return;
        case "assist-diff-risk":
          await viewProviderSupport.assessDiffRiskFromTools.call(this);
          return;
        case "assist-summarize-validation":
          await viewProviderSupport.summarizeValidationFromTools.call(this);
          return;
        case "assist-summarize-changelog":
          await viewProviderSupport.summarizeChangelogFromTools.call(this);
          return;
        case "assist-prepare-release":
          await viewProviderSupport.prepareReleaseFromTools.call(this);
          return;
        case "assist-publish-release":
          await viewProviderSupport.publishReleaseFromTools.call(this);
          return;
        case "assist-validation-checklist":
          await viewProviderSupport.buildValidationChecklistFromTools.call(this);
          return;
        case "assist-doc-consistency":
          await viewProviderSupport.reviewDocConsistencyFromTools.call(this);
          return;
        case "open-hybrid-insights":
          await viewProviderSupport.openHybridInsightsFromTools.call(this);
          return;
        case "open-logics-insights":
          await viewProviderSupport.openLogicsInsightsFromTools.call(this);
          return;
        case "open-onboarding":
          viewProviderSupport.openOnboardingPanel.call(this);
          return;
        case "tool-action":
          if (message.action) {
            await this.view?.webview.postMessage({ type: "trigger-tool-action", action: message.action });
          }
          return;
        case "about":
          await viewProviderSupport.openAbout.call(this);
          return;
        case "change-project-root":
          await viewProviderSupport.changeProjectRoot.call(this);
          return;
        case "reset-project-root":
          await viewProviderSupport.resetProjectRoot.call(this);
          return;
        case "mark-done":
          await viewProviderSupport.markItemDone.call(this, message.id);
          return;
        case "mark-obsolete":
          await viewProviderSupport.markItemObsolete.call(this, message.id);
          return;
        default:
          assertNever(message);
      }
    });

  }

  getWatcherRoot(): string | null {
    return viewProviderSupport.resolveProjectRoot.call(this).root;
  }

  async refresh(selectedId?: string): Promise<void> {
    const { root, invalidOverridePath } = viewProviderSupport.resolveProjectRoot.call(this);
    const canResetProjectRoot = viewProviderSupport.canResetProjectRoot.call(this);
    const bootstrapState = root ? inspectLogicsBootstrapState(root) : null;
    const canBootstrapLogics = Boolean(bootstrapState?.canBootstrap);
    viewProviderSupport.notifyInvalidRootOverride.call(this, invalidOverridePath, Boolean(root));
    if (!root) {
      this.items = [];
      await viewProviderSupport.clearAgentRegistry.call(this);
      viewProviderSupport.postData.call(this, {
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

    viewProviderSupport.maybeShowOnboarding.call(this, root);

    if (!fs.existsSync(path.join(root, "logics"))) {
      this.items = [];
      await viewProviderSupport.clearAgentRegistry.call(this);
      viewProviderSupport.postData.call(this, {
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
      await viewProviderSupport.maybeOfferBootstrap.call(this, root);
      return;
    }

    let indexedItems: LogicsItem[] = [];
    try {
      indexedItems = indexLogics(root);
    } catch (error) {
      this.items = [];
      await viewProviderSupport.clearAgentRegistry.call(this);
      viewProviderSupport.postData.call(this, {
        root,
        canBootstrapLogics,
        bootstrapLogicsTitle: bootstrapState?.actionTitle,
        canResetProjectRoot,
        canLaunchCodex: false,
        launchCodexTitle: "Unavailable",
        canLaunchClaude: false,
        launchClaudeTitle: "Unavailable",
        canRepairLogicsKit: true,
        repairLogicsKitTitle: "Check current Logics runtime state and repair the shared kit publication or bridge files.",
        canPublishRelease: false,
        publishReleaseTitle: "Unavailable",
        shouldRecommendCheckEnvironment: true,
        error: `Could not index Logics docs in ${root}: ${error instanceof Error ? error.message : String(error)}`
      });
      return;
    }
    this.items = indexedItems;

    try {
      await viewProviderSupport.refreshAgents.call(this, "silent", root);
    } catch {
      // Agent discovery is non-blocking for board hydration.
    }

    const [changedPathsResult, launchersResult, environmentSnapshotResult, publishReleaseCapabilityResult] = await Promise.allSettled([
      viewProviderSupport.getGitChangedPaths.call(this, root),
      inspectRuntimeLaunchers(root),
      inspectLogicsEnvironment(root),
      inspectGitHubReleaseCapability(root)
    ]);
    const changedPaths = changedPathsResult.status === "fulfilled" ? changedPathsResult.value : [];
    const launchers = launchersResult.status === "fulfilled" ? launchersResult.value : UNAVAILABLE_LAUNCHER_STATE;
    const environmentSnapshot = environmentSnapshotResult.status === "fulfilled" ? environmentSnapshotResult.value : null;
    const publishReleaseCapability =
      publishReleaseCapabilityResult.status === "fulfilled"
        ? publishReleaseCapabilityResult.value
        : UNAVAILABLE_RELEASE_CAPABILITY;
    const shouldRecommendCheckEnvironment = await this.shouldRecommendCheckEnvironment(root, environmentSnapshot, bootstrapState);
    viewProviderSupport.postData.call(this, {
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
      activeAgent: viewProviderSupport.getActiveAgentPayload.call(this),
      changedPaths
    });
    const startupKitPromptShown = await viewProviderSupport.maybeOfferStartupKitUpdate.call(this, root, bootstrapState);
    if (!startupKitPromptShown) {
      const bootstrapTriggered = await viewProviderSupport.maybeOfferBootstrap.call(this, root);
      if (bootstrapTriggered || this.codexWorkflowController.isBootstrapInProgress(root)) {
        return;
      }
      await this.codexWorkflowController.ensureGlobalCodexKit(root);
      await viewProviderSupport.maybeOfferCodexStartupRemediation.call(this, root);
    }
  }

  async openFromPalette(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const pick = await viewProviderSupport.pickItem.call(this, this.items, "Open Logics item");
    if (pick) {
      await viewProviderSupport.openItem.call(this, pick.id);
    }
  }

  async promoteFromPalette(): Promise<void> {
    if (!this.items.length) {
      await this.refresh();
    }
    const promotable = this.items.filter(
      (item) => canPromote(item.stage) && !item.isPromoted && !isRequestProcessed(item, this.items)
    );
    const pick = await viewProviderSupport.pickItem.call(this, promotable, "Promote Logics item");
    if (pick) {
      await viewProviderSupport.promoteItem.call(this, pick.id);
    }
  }

  async selectAgentFromPalette(): Promise<void> {
    const root = await viewProviderSupport.getActionRoot.call(this);
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      return;
    }

    await viewProviderSupport.refreshAgents.call(this, "silent", root);
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

    await viewProviderSupport.setActiveAgent.call(this, pick.agent.id);
    await (this as any).injectAgentPromptIntoCodexChat(pick.agent);
    void vscode.window.showInformationMessage(`Active Logics agent: ${pick.agent.displayName} (${pick.agent.id})`);
    await this.refresh();
  }

  async checkEnvironmentFromCommand(): Promise<void> {
    await this.checkEnvironmentFromTools();
  }

  async refreshAgentsFromCommand(): Promise<void> {
    const root = await viewProviderSupport.getActionRoot.call(this);
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      return;
    }

    await viewProviderSupport.refreshAgents.call(this, "notify", root);
  }

  async openHybridInsightsFromCommand(): Promise<void> {
    await this.hybridAssistController.openHybridInsightsFromTools();
  }

  async openLogicsInsightsFromCommand(): Promise<void> {
    await this.logicsCorpusInsightsController.openLogicsInsightsFromTools();
  }

  openOnboardingFromCommand(): void {
    viewProviderSupport.openOnboardingPanel.call(this);
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
    const root = await viewProviderSupport.getActionRoot.call(this);
    if (!root) {
      return;
    }
    await this.codexWorkflowController.launchCodexFromTools(root);
  }

  private async launchClaudeFromTools(): Promise<void> {
    const root = await viewProviderSupport.getActionRoot.call(this);
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
    const root = await viewProviderSupport.getActionRoot.call(this);
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
    const { root, invalidOverridePath } = viewProviderSupport.resolveProjectRoot.call(this);
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
      const kitVersionItem = viewProviderSupport.buildKitVersionQuickPickItem.call(this, root);
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
      const yamlItem = viewProviderSupport.buildLogicsYamlBlocksQuickPickItem.call(this, root);
      if (yamlItem) {
        recommendedActions.push(yamlItem);
      }
    }

    if (root) {
      const gitignoreItem = await viewProviderSupport.buildGitignoreArtifactsQuickPickItem.call(this, root);
      if (gitignoreItem) {
        detailItems.push(gitignoreItem);
      }
    }

    if (root) {
      const dangerousGitignore = detectDangerousGitignorePatterns(root);
      if (dangerousGitignore.hasDangerousPatterns) {
        detailItems.push({
          label: "Gitignore warning: logics/skills may be hidden",
          description: `${dangerousGitignore.reason} The extension can still recover via fallback copy or clone after confirmation.`
        });
      }
    }

    if (root) {
      const envLocalItem = viewProviderSupport.buildMissingEnvLocalQuickPickItem.call(this, root);
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
        label: `Environment: ${viewProviderSupport.getEnvironmentOverallState.call(this, snapshot, hybridRuntime, recommendedActions)}`,
        description: viewProviderSupport.getEnvironmentSummaryDescription.call(this, snapshot, hybridRuntime, recommendedActions)
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
      viewProviderSupport.ensureLogicsCacheDir.call(this, root);
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
        viewProviderSupport.writeEnvironmentDiagnosticReport.call(this, root, snapshot, recommendedActions, statusItems, detailItems);
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
    snapshot: LogicsEnvironmentSnapshot | null,
    bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null
  ): Promise<boolean> {
    return viewProviderSupport.shouldRecommendCheckEnvironment.call(this, root, snapshot, bootstrapState);
  }
}
