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
import { LogicsViewDocumentController } from "./logicsViewDocumentController";
import {
  areSamePath,
  getWorkspaceRoot,
  hasLogicsSubmodule,
  hasMultipleWorkspaceFolders,
  isExistingDirectory,
  runGitWithOutput,
  runPythonWithOutput,
  updateIndicatorsOnDisk
} from "./logicsProviderUtils";

const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";

export class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private readonly bootstrapPromptedRoots = new Set<string>();
  private projectRootOverride: string | null;
  private invalidRootNotice?: string;
  private activeAgentId: string | null;
  private agentRegistry: AgentRegistrySnapshot = createEmptyAgentRegistry();
  private readPreviewPanel?: vscode.WebviewPanel;
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
        case "fix-docs":
          await this.fixDocs();
          break;
        case "select-agent":
          await this.selectAgentFromPalette();
          break;
        case "bootstrap-logics":
          await this.bootstrapFromTools();
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
    const canBootstrapLogics = root ? !hasLogicsSubmodule(root) : false;
    this.notifyInvalidRootOverride(invalidOverridePath, Boolean(root));
    if (!root) {
      this.items = [];
      await this.clearAgentRegistry();
      this.postData({
        canBootstrapLogics,
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
        canResetProjectRoot,
        error: `No logics/ folder found in: ${root}.`
      });
      await this.maybeOfferBootstrap(root);
      return;
    }

    this.items = indexLogics(root);
    await this.refreshAgents("silent", root);
    this.postData({
      items: this.items,
      root,
      selectedId,
      canBootstrapLogics,
      canResetProjectRoot,
      activeAgentId: this.activeAgentId ?? undefined
    });
    await this.maybeOfferBootstrap(root);
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

  async createRequest(): Promise<void> {
    await this.documentController.createRequest();
  }

  async startGuidedRequestFromTools(): Promise<void> {
    await this.documentController.startGuidedRequestFromTools();
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
    if (hasLogicsSubmodule(root)) {
      void vscode.window.showInformationMessage("Logics bootstrap already configured.");
      return;
    }
    await this.bootstrapLogics(root);
  }

  private async openAbout(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(PROJECT_GITHUB_URL));
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
    }
  ): Promise<void> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      return;
    }

    const codexCopiedMessage = options?.codexCopiedMessage || "Codex opened. Prompt copied to clipboard. Paste it in the Codex composer.";
    const fallbackCopiedMessage = options?.fallbackCopiedMessage || "Could not inject prompt into Codex chat.";

    try {
      const availableCommands = await vscode.commands.getCommands(true);
      const hasCodexSidebarCommand = availableCommands.includes("chatgpt.openSidebar");
      const hasCodexNewChatCommand = availableCommands.includes("chatgpt.newChat");
      const hasWorkbenchChatCommand = availableCommands.includes("workbench.action.chat.open");

      if (hasCodexSidebarCommand) {
        await vscode.commands.executeCommand("chatgpt.openSidebar");
        await vscode.env.clipboard.writeText(normalizedPrompt);
        if (hasCodexNewChatCommand) {
          const action = await vscode.window.showInformationMessage(codexCopiedMessage, "New Codex Thread");
          if (action === "New Codex Thread") {
            await vscode.commands.executeCommand("chatgpt.newChat");
          }
        } else {
          void vscode.window.showInformationMessage(codexCopiedMessage);
        }
        return;
      }

      if (hasWorkbenchChatCommand) {
        await vscode.commands.executeCommand("workbench.action.chat.open", {
          query: normalizedPrompt,
          isPartialQuery: true
        });
        await vscode.commands.executeCommand("workbench.action.chat.focusInput");
        return;
      }

      throw new Error("No supported chat open command available");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await vscode.env.clipboard.writeText(normalizedPrompt);
      void vscode.window.showWarningMessage(`${fallbackCopiedMessage} (${message}). Prompt copied to clipboard.`);
    }
  }

  private async injectAgentPromptIntoCodexChat(agent: AgentDefinition): Promise<void> {
    await this.injectPromptIntoCodexChat(agent.defaultPrompt, {
      codexCopiedMessage: "Codex opened. Agent prompt copied to clipboard. Paste it in the Codex composer.",
      fallbackCopiedMessage: "Could not inject prompt into Codex chat"
    });
  }

  private async maybeOfferBootstrap(root: string): Promise<void> {
    if (this.bootstrapPromptedRoots.has(root)) {
      return;
    }
    if (hasLogicsSubmodule(root)) {
      return;
    }
    this.bootstrapPromptedRoots.add(root);

    const choice = await vscode.window.showInformationMessage(
      "No logics/ folder found. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      "Bootstrap Logics",
      "Not now"
    );
    if (choice !== "Bootstrap Logics") {
      return;
    }
    await this.bootstrapLogics(root);
  }

  private async bootstrapLogics(root: string): Promise<void> {
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
        void vscode.window.showErrorMessage(`Bootstrap script failed: ${result.stderr || result.error.message}`);
        return;
      }
    }

    await this.maybeOfferBootstrapCommit(root, beforeBootstrapStatus);
    void vscode.window.showInformationMessage("Logics bootstrapped. Refreshing.");
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
    canResetProjectRoot?: boolean;
    activeAgentId?: string;
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
