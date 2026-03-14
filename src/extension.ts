import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import {
  addLinkToSection,
  normalizeEntrySuffix,
  parseRenameTarget,
  replaceManagedReferenceTokens,
  validateRenameSuffix
} from "./logicsDocMaintenance";
import {
  canPromote,
  getManagedDocDirectories,
  indexLogics,
  isRequestUsed,
  LogicsItem,
  promotionCommand
} from "./logicsIndexer";
import {
  AgentDefinition,
  AgentRegistrySnapshot,
  createEmptyAgentRegistry,
  extractExplicitAgentInvocation,
  loadAgentRegistry
} from "./agentRegistry";
import { execFile } from "child_process";
import {
  buildBootstrapCommitMessage,
  buildGuidedRequestPrompt,
  isBootstrapScopedPath,
  parseGitStatusEntries,
  renderMarkdownToHtml
} from "./workflowSupport";

const ROOT_OVERRIDE_STATE_KEY = "logics.projectRootOverride";
const ACTIVE_AGENT_STATE_KEY = "logics.activeAgentId";
const PROJECT_GITHUB_URL = "https://github.com/AlexAgo83/cdx-logics-vscode";

class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private readonly bootstrapPromptedRoots = new Set<string>();
  private projectRootOverride: string | null;
  private invalidRootNotice?: string;
  private activeAgentId: string | null;
  private agentRegistry: AgentRegistrySnapshot = createEmptyAgentRegistry();
  private readPreviewPanel?: vscode.WebviewPanel;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly onProjectRootChanged: () => void,
    private readonly agentsOutput: vscode.OutputChannel
  ) {
    const storedOverride = this.context.workspaceState.get<string>(ROOT_OVERRIDE_STATE_KEY);
    this.projectRootOverride = storedOverride?.trim() || null;
    const storedAgentId = this.context.workspaceState.get<string>(ACTIVE_AGENT_STATE_KEY);
    this.activeAgentId = storedAgentId?.trim() || null;
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
          await this.createCompanionDocFromPalette(message.id);
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
      (item) => canPromote(item.stage) && !item.isPromoted && !isRequestUsed(item)
    );
    const pick = await this.pickItem(promotable, "Promote Logics item");
    if (pick) {
      await this.promoteItem(pick.id);
    }
  }

  async selectAgentFromPalette(): Promise<void> {
    const root = this.getActionRoot();
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
    const root = this.getActionRoot();
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
    const root = this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.maybeOfferBootstrap(root);
      return;
    }

    const title = await vscode.window.showInputBox({
      title: "New Logics request",
      prompt: "Title for the request"
    });
    if (!title) {
      return;
    }

    const scriptPath = getFlowManagerScriptPath(root);
    if (!scriptPath) {
      void vscode.window.showErrorMessage(
        "Logics flow script not found at logics/skills/logics-flow-manager/scripts/logics_flow.py."
      );
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["new", "request", "--title", title]);
    if (result.error) {
      void vscode.window.showErrorMessage(`Request creation failed: ${result.stderr || result.error.message}`);
      return;
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.refresh();
  }

  async startGuidedRequestFromTools(): Promise<void> {
    const root = this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.maybeOfferBootstrap(root);
      return;
    }

    await this.refreshAgents("silent", root);
    const agent = this.findRequestAuthoringAgent();
    if (!agent) {
      const issueHint = this.agentRegistry.issues.length > 0 ? " Check 'Logics Agents' output for validation errors." : "";
      void vscode.window.showWarningMessage(`No request-authoring agent found in logics/skills.${issueHint}`);
      if (this.agentRegistry.issues.length > 0) {
        this.agentsOutput.show(true);
      }
      return;
    }

    await this.setActiveAgent(agent.id);
    const prompt = buildGuidedRequestPrompt(agent.defaultPrompt);
    await this.injectPromptIntoCodexChat(prompt, {
      codexCopiedMessage: "Codex opened. New-request prompt copied to clipboard. Paste it in the Codex composer.",
      fallbackCopiedMessage: "Could not inject the new-request prompt into Codex chat."
    });
    void vscode.window.showInformationMessage(`Active Logics agent: ${agent.displayName} (${agent.id})`);
    await this.refresh();
  }

  async createItem(kind: "request" | "backlog" | "task"): Promise<void> {
    const root = this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.maybeOfferBootstrap(root);
      return;
    }

    const config = getCreateConfig(kind);
    if (!config) {
      void vscode.window.showErrorMessage("Unsupported item type.");
      return;
    }

    const title = await vscode.window.showInputBox({
      title: `New Logics ${config.label}`,
      prompt: `Title for the ${config.label}`
    });
    if (!title) {
      return;
    }

    const scriptPath = getFlowManagerScriptPath(root);
    if (!scriptPath) {
      void vscode.window.showErrorMessage(
        "Logics flow script not found at logics/skills/logics-flow-manager/scripts/logics_flow.py."
      );
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["new", kind, "--title", title]);
    if (result.error) {
      void vscode.window.showErrorMessage(
        `Creation failed: ${result.stderr || result.error.message}`
      );
      return;
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.refresh();
  }

  async createCompanionDoc(sourceId: string): Promise<void> {
    const root = this.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.maybeOfferBootstrap(root);
      return;
    }

    const sourceItem = this.items.find((entry) => entry.id === sourceId);
    if (!sourceItem) {
      void vscode.window.showErrorMessage("Select a Logics item before creating a companion doc.");
      return;
    }

    const kindPick = await vscode.window.showQuickPick<{ label: string; description: string; value: "product" | "architecture" }>(
      [
        {
          label: "Product brief",
          description: "Create a non-technical product framing companion doc",
          value: "product"
        },
        {
          label: "Architecture decision",
          description: "Create a structural technical companion doc",
          value: "architecture"
        }
      ],
      {
        title: "Create companion doc",
        placeHolder: `Choose the companion doc type for ${sourceItem.id}`
      }
    );
    if (!kindPick) {
      return;
    }

    const title = await vscode.window.showInputBox({
      title: `New ${kindPick.label.toLowerCase()}`,
      prompt: `Title for the ${kindPick.label.toLowerCase()}`,
      value: sourceItem.title
    });
    if (!title) {
      return;
    }

    const scriptPath = getCompanionDocScriptPath(root, kindPick.value);
    if (!scriptPath) {
      void vscode.window.showErrorMessage(`Companion doc script not found for ${kindPick.label.toLowerCase()}.`);
      return;
    }

    const outDir = kindPick.value === "product" ? "logics/product" : "logics/architecture";
    const result = await runPythonWithOutput(root, scriptPath, ["--title", title, "--out-dir", outDir]);
    if (result.error) {
      void vscode.window.showErrorMessage(
        `${kindPick.label} creation failed: ${result.stderr || result.error.message}`
      );
      return;
    }

    const createdPath = findCreatedDocPathFromOutput(result.stdout);
    if (createdPath && fs.existsSync(createdPath)) {
      const createdRelPath = path.relative(root, createdPath).replace(/\\/g, "/");
      addLinkToSectionOnDisk(sourceItem.path, "References", createdRelPath);
      addLinkToSectionOnDisk(createdPath, "References", sourceItem.relPath);
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.refresh(sourceItem.id);
  }

  async createCompanionDocFromPalette(preferredSourceId?: string): Promise<void> {
    const sourceItem = await this.resolveCompanionDocSource(preferredSourceId);
    if (!sourceItem) {
      return;
    }
    await this.createCompanionDoc(sourceItem.id);
  }

  async fixDocs(): Promise<void> {
    const root = this.getActionRoot();
    if (!root) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      "Run Logics fixer? This will update Logics docs on disk.",
      { modal: true },
      "Run Fix Logics"
    );
    if (confirm !== "Run Fix Logics") {
      return;
    }

    const scriptPath = path.join(
      root,
      "logics",
      "skills",
      "logics-doc-fixer",
      "scripts",
      "fix_logics_docs.py"
    );

    if (!fs.existsSync(scriptPath)) {
      void vscode.window.showErrorMessage("Logics doc fixer script not found in logics/skills.");
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["--write"]);
    if (result.error) {
      void vscode.window.showErrorMessage(`Doc fixer failed: ${result.stderr || result.error.message}`);
      return;
    }

    void vscode.window.showInformationMessage("Logics docs fixer completed.");
    await this.refresh();
  }

  private async bootstrapFromTools(): Promise<void> {
    const root = this.getActionRoot();
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

  private getActionRoot(): string | null {
    const { root, invalidOverridePath } = this.resolveProjectRoot();
    this.notifyInvalidRootOverride(invalidOverridePath, Boolean(root));
    if (!root) {
      void vscode.window.showErrorMessage(
        invalidOverridePath
          ? `Configured project root not found: ${invalidOverridePath}. Use Tools > Change Project Root.`
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

      await vscode.commands.executeCommand("workbench.action.chat.open");
      await vscode.commands.executeCommand("workbench.action.chat.focusInput");
      const existingInput = await this.captureCurrentChatInput();
      if (existingInput && extractExplicitAgentInvocation(existingInput)) {
        void vscode.window.showInformationMessage(
          "Chat input already contains an explicit $logics-... invocation. Leaving current draft unchanged."
        );
        return;
      }

      const merged =
        existingInput && existingInput.trim().length > 0 ? `${normalizedPrompt}\n\n${existingInput}` : normalizedPrompt;
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: merged,
        isPartialQuery: true
      });
      await vscode.commands.executeCommand("workbench.action.chat.focusInput");
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

  private async captureCurrentChatInput(): Promise<string | null> {
    const originalClipboard = await vscode.env.clipboard.readText();
    const sentinel = `__logics_capture_${Date.now()}_${Math.random().toString(16).slice(2)}__`;

    try {
      await vscode.env.clipboard.writeText(sentinel);
      await vscode.commands.executeCommand("editor.action.selectAll");
      await vscode.commands.executeCommand("editor.action.clipboardCopyAction");
      await delay(40);
      const captured = await vscode.env.clipboard.readText();
      if (captured === sentinel) {
        return null;
      }
      return captured;
    } catch {
      return null;
    } finally {
      await vscode.env.clipboard.writeText(originalClipboard);
    }
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

    const mermaidRoot = vscode.Uri.file(path.join(this.context.extensionPath, "node_modules", "mermaid", "dist"));
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

  private async resolveCompanionDocSource(preferredSourceId?: string): Promise<LogicsItem | undefined> {
    if (preferredSourceId) {
      const matched = this.items.find((item) => item.id === preferredSourceId);
      if (matched) {
        return matched;
      }
    }

    if (!this.items.length) {
      await this.refresh();
    }

    const sourceCandidates = this.items.filter((item) =>
      item.stage === "request" || item.stage === "backlog" || item.stage === "task"
    );
    return this.pickItem(sourceCandidates, "Choose the source item for the companion doc");
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
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    const document = await vscode.workspace.openTextDocument(item.path);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  private async readItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    try {
      const markdown = fs.readFileSync(item.path, "utf8");
      const panel = this.getReadPreviewPanel();
      panel.title = `Read: ${item.id}`;
      panel.webview.html = buildReadPreviewHtml({
        title: item.title,
        itemId: item.id,
        relPath: item.relPath,
        markdown,
        webview: panel.webview,
        extensionPath: this.context.extensionPath
      });
      panel.reveal(vscode.ViewColumn.Beside, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Could not open rendered Markdown preview (${message}). Opening in Edit.`);
      await this.openItem(id);
    }
  }

  private async promoteItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = this.getActionRoot();
    if (!root) {
      return;
    }

    const promotion = promotionCommand(item.stage);
    if (!promotion) {
      void vscode.window.showInformationMessage("Promotion is only available for request or backlog items.");
      return;
    }
    if (isRequestUsed(item)) {
      void vscode.window.showInformationMessage("This request has already been used and cannot be promoted.");
      return;
    }
    if (item.isPromoted) {
      void vscode.window.showInformationMessage("This item has already been promoted.");
      return;
    }

    const scriptPath = getFlowManagerScriptPath(root);
    if (!scriptPath) {
      void vscode.window.showErrorMessage(
        "Logics flow script not found at logics/skills/logics-flow-manager/scripts/logics_flow.py."
      );
      return;
    }

    await runPython(root, scriptPath, ["promote", promotion, item.path]);
    await this.refresh();
  }

  private async addReference(id: string): Promise<void> {
    await this.addLinksToSection(id, "References", "reference");
  }

  private async addUsedBy(id: string): Promise<void> {
    await this.addLinksToSection(id, "Used by", "used-by link");
  }

  private async renameItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = this.getActionRoot();
    if (!root) {
      return;
    }

    const parsed = parseRenameTarget(item.id);
    if (!parsed) {
      void vscode.window.showErrorMessage("Only request/backlog/task/product/architecture entries can be renamed.");
      return;
    }

    const suffixInput = await vscode.window.showInputBox({
      title: "Rename Logics entry",
      prompt: `Only edit the suffix after ${parsed.immutablePrefix}`,
      placeHolder: "new_entry_name",
      value: parsed.suffix,
      validateInput: (value) => validateRenameSuffix(value, parsed, item.path)
    });
    if (suffixInput === undefined) {
      return;
    }

    const normalizedSuffix = normalizeEntrySuffix(suffixInput);
    if (!normalizedSuffix) {
      void vscode.window.showErrorMessage("Invalid name suffix. Use letters or numbers.");
      return;
    }

    const newId = `${parsed.immutablePrefix}${normalizedSuffix}`;
    if (newId === item.id) {
      void vscode.window.showInformationMessage("No changes detected.");
      return;
    }

    const newPath = path.join(path.dirname(item.path), `${newId}.md`);
    if (fs.existsSync(newPath)) {
      void vscode.window.showErrorMessage("A file with that name already exists.");
      return;
    }

    const oldRelPath = item.relPath;
    const newRelPath = path.relative(root, newPath).replace(/\\/g, "/");

    try {
      fs.renameSync(item.path, newPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Rename failed: ${message}`);
      return;
    }

    try {
      updateMainHeadingId(newPath, item.id, newId);
      updateManagedReferencesForRename(root, oldRelPath, newRelPath, item.id, newId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showWarningMessage(
        `Entry renamed to ${newId}, but some references may need manual updates: ${message}`
      );
      await this.refresh(newId);
      return;
    }

    void vscode.window.showInformationMessage(`Renamed entry to ${newId}.`);
    await this.refresh(newId);
  }

  private async addLinksToSection(
    id: string,
    sectionTitle: "References" | "Used by",
    relationLabel: string
  ): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = this.getActionRoot();
    if (!root) {
      return;
    }

    const pickedLinks = await this.pickRelationLinks(item, sectionTitle, relationLabel, root);
    if (!pickedLinks.length) {
      return;
    }

    let addedCount = 0;
    for (const link of pickedLinks) {
      const result = addLinkToSectionOnDisk(item.path, sectionTitle, link);
      if (result.changed) {
        addedCount += 1;
      }
    }

    if (addedCount === 0) {
      void vscode.window.showInformationMessage(`All selected ${relationLabel}s already exist.`);
      return;
    }

    void vscode.window.showInformationMessage(`Added ${addedCount} ${relationLabel}${addedCount > 1 ? "s" : ""}.`);
    await this.refresh(item.id);
  }

  private async pickRelationLinks(
    sourceItem: LogicsItem,
    sectionTitle: "References" | "Used by",
    relationLabel: string,
    root: string
  ): Promise<string[]> {
    const links: string[] = [];
    const seen = new Set<string>();

    while (true) {
      const pick = await this.pickSingleRelationLink(sourceItem, sectionTitle);
      if (!pick) {
        break;
      }
      const normalized = normalizeRelationPath(pick, this.items, root);
      if (!normalized) {
        continue;
      }
      if (!seen.has(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }

      const nextAction = await vscode.window.showQuickPick(
        [
          { label: "Done", value: "done" },
          { label: `Add another ${relationLabel}`, value: "again" }
        ],
        {
          title: sectionTitle,
          placeHolder: "Choose next action"
        }
      );
      if (!nextAction || nextAction.value === "done") {
        break;
      }
    }

    return links;
  }

  private async pickSingleRelationLink(
    sourceItem: LogicsItem,
    sectionTitle: "References" | "Used by"
  ): Promise<string | undefined> {
    const choices = this.items
      .filter((item) => item.id !== sourceItem.id)
      .map((item) => ({
        label: `${item.stage} • ${item.id}`,
        description: item.title,
        value: item.relPath
      }));

    choices.unshift({
      label: "Custom path…",
      description: "Type a relative path (ex: logics/tasks/task_008_example.md)",
      value: "__custom__"
    });

    const pick = await vscode.window.showQuickPick(choices, {
      title: sectionTitle,
      placeHolder: "Pick a target item or enter a custom path"
    });
    if (!pick) {
      return undefined;
    }
    if (pick.value !== "__custom__") {
      return pick.value;
    }

    const custom = await vscode.window.showInputBox({
      title: sectionTitle,
      prompt: "Path to link (relative path recommended)",
      placeHolder: "logics/backlog/item_004_add_references_and_used_by_links.md"
    });
    return custom?.trim();
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "main.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "main.css"));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Logics Orchestrator</title>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar__actions">
      <div class="toolbar__filters">
        <button class="toolbar__filter" id="filter-toggle" aria-label="Filter options" aria-expanded="false" aria-controls="filter-panel" title="Filter options">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M4 6h16l-6 7v5l-4 2v-7z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <div class="filter-panel" id="filter-panel" aria-hidden="true" role="group" aria-label="Filter options">
          <label class="toggle">
            <input type="checkbox" id="hide-used-requests" />
            <span>Hide used requests</span>
          </label>
          <label class="toggle">
            <input type="checkbox" id="hide-complete" />
            <span>Hide completed</span>
          </label>
          <label class="toggle">
            <input type="checkbox" id="hide-spec" />
            <span>Hide SPEC</span>
          </label>
          <label class="toggle">
            <input type="checkbox" id="show-companion-docs" />
            <span>Show companion docs</span>
          </label>
        </div>
        <div class="toolbar__tools">
          <button
            class="toolbar__filter"
            id="tools-toggle"
            aria-label="Tools"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-controls="tools-panel"
            title="Tools"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M4 7h16M6 12h12M8 17h8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div class="tools-panel" id="tools-panel" aria-hidden="true" role="menu">
            <button class="tools-panel__item" type="button" role="menuitem" data-action="select-agent" title="Select active agent">Select Agent</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="new-request-guided" title="Start a guided new request">New Request</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="create-companion-doc" title="Create a companion doc">Create Companion Doc</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="bootstrap-logics" title="Bootstrap Logics">Bootstrap Logics</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="change-project-root" title="Change project root">Change Project Root</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="reset-project-root" title="Use workspace root">Use Workspace Root</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="fix-docs" title="Fix Logics">Fix Logics</button>
            <button class="tools-panel__item" type="button" role="menuitem" data-action="about" title="About this extension">About</button>
          </div>
        </div>
      </div>
      <div class="toolbar__buttons">
        <button class="btn" data-action="toggle-view-mode" title="Switch display mode">List</button>
        <button class="btn" data-action="refresh" title="Refresh">Refresh</button>
      </div>
    </div>
  </div>
  <div class="layout" id="layout">
    <div class="board" id="board"></div>
    <div class="splitter" id="splitter" role="separator" aria-orientation="horizontal" aria-label="Resize details panel" tabindex="0"></div>
    <aside class="details" id="details">
      <div class="details__header">
        <div class="details__header-title" id="details-title">Details</div>
        <button class="details__toggle" id="details-toggle" aria-label="Collapse details" aria-expanded="true" title="Collapse details">
          <svg class="details__toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
      <div class="details__body" id="details-body">
        <div class="details__empty">Select a card to see details.</div>
      </div>
      <div class="details__actions">
        <button class="btn" data-action="promote" disabled title="Promote selected item">Promote</button>
        <button class="btn" data-action="mark-done" disabled title="Mark selected item as done">Done</button>
        <button class="btn" data-action="mark-obsolete" disabled title="Mark selected item as obsolete">Obsolete</button>
        <button class="btn" data-action="open" disabled title="Edit selected item">Edit</button>
        <button class="btn" data-action="read" disabled title="Read selected item">Read</button>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function buildReadPreviewHtml(params: {
  title: string;
  itemId: string;
  relPath: string;
  markdown: string;
  webview: vscode.Webview;
  extensionPath: string;
}): string {
  const nonce = getNonce();
  const { title, itemId, relPath, markdown, webview, extensionPath } = params;
  const mermaidScriptPath = path.join(extensionPath, "node_modules", "mermaid", "dist", "mermaid.min.js");
  const mermaidScriptUri = fs.existsSync(mermaidScriptPath)
    ? webview.asWebviewUri(vscode.Uri.file(mermaidScriptPath)).toString()
    : "";
  const renderedMarkdown = renderMarkdownToHtml(markdown);
  const escapedTitle = escapeHtmlForHtml(title);
  const escapedItemId = escapeHtmlForHtml(itemId);
  const escapedRelPath = escapeHtmlForHtml(relPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedItemId}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --ink: #e5e7eb;
      --muted: #94a3b8;
      --border: rgba(148, 163, 184, 0.28);
      --accent: #38bdf8;
      --code-bg: rgba(148, 163, 184, 0.14);
    }
    body {
      margin: 0;
      padding: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #0b1220 0%, #111827 100%);
      color: var(--ink);
    }
    .read-preview {
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 24px 48px;
    }
    .read-preview__header {
      margin-bottom: 24px;
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(10px);
    }
    .read-preview__eyebrow {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .read-preview__title {
      margin: 0 0 4px;
      font-size: 32px;
      line-height: 1.1;
    }
    .read-preview__path {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .markdown-preview {
      padding: 26px 28px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.9);
      box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
    }
    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3,
    .markdown-preview h4,
    .markdown-preview h5,
    .markdown-preview h6 {
      line-height: 1.15;
      margin: 1.4em 0 0.6em;
    }
    .markdown-preview h1:first-child,
    .markdown-preview h2:first-child,
    .markdown-preview h3:first-child {
      margin-top: 0;
    }
    .markdown-preview p,
    .markdown-preview li {
      line-height: 1.65;
      color: var(--ink);
    }
    .markdown-preview ul,
    .markdown-preview ol {
      padding-left: 1.4rem;
    }
    .markdown-preview a {
      color: #7dd3fc;
    }
    .markdown-preview pre {
      overflow-x: auto;
      padding: 16px;
      border-radius: 14px;
      background: var(--code-bg);
      border: 1px solid rgba(148, 163, 184, 0.18);
    }
    .markdown-preview code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }
    .markdown-preview p code,
    .markdown-preview li code,
    .markdown-preview h1 code,
    .markdown-preview h2 code,
    .markdown-preview h3 code {
      padding: 2px 6px;
      border-radius: 6px;
      background: var(--code-bg);
    }
    .markdown-preview__diagram {
      margin: 24px 0;
    }
    .markdown-preview__diagram svg {
      max-width: 100%;
      height: auto;
    }
    .markdown-preview__mermaid-fallback {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #fecaca;
      background: rgba(127, 29, 29, 0.35);
      border: 1px solid rgba(248, 113, 113, 0.35);
    }
  </style>
</head>
<body>
  <div class="read-preview">
    <header class="read-preview__header">
      <p class="read-preview__eyebrow">${escapedItemId}</p>
      <h1 class="read-preview__title">${escapedTitle}</h1>
      <p class="read-preview__path">${escapedRelPath}</p>
    </header>
    <main class="markdown-preview">${renderedMarkdown}</main>
  </div>
  ${mermaidScriptUri ? `<script src="${mermaidScriptUri}"></script>` : ""}
  <script nonce="${nonce}">
    (() => {
      const fallbackNodes = Array.from(document.querySelectorAll(".markdown-preview__mermaid-fallback"));
      const showFallback = (message) => {
        fallbackNodes.forEach((node) => {
          node.hidden = false;
          if (message) {
            node.textContent = message;
          }
        });
      };

      if (!window.mermaid) {
        showFallback("Mermaid preview unavailable. Raw diagram source shown below.");
        return;
      }

      try {
        window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        const nodes = Array.from(document.querySelectorAll(".mermaid"));
        if (nodes.length === 0) {
          return;
        }
        Promise.resolve(window.mermaid.run({ nodes })).catch((error) => {
          const detail = error instanceof Error ? error.message : String(error);
          showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
      }
    })();
  </script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext): void {
  let provider: LogicsViewProvider | undefined;
  let refreshTimer: NodeJS.Timeout | undefined;
  let watcher: vscode.FileSystemWatcher | undefined;
  const agentsOutput = vscode.window.createOutputChannel("Logics Agents");
  context.subscriptions.push(agentsOutput);

  const scheduleRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      void provider?.refresh();
    }, 300);
  };

  const setupWatcher = () => {
    if (watcher) {
      watcher.dispose();
      watcher = undefined;
    }
    const root = provider?.getWatcherRoot();
    if (!root) {
      return;
    }
    const pattern = new vscode.RelativePattern(root, "logics/**/*.{md,markdown,yaml,yml}");
    watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidChange(scheduleRefresh);
    watcher.onDidCreate(scheduleRefresh);
    watcher.onDidDelete(scheduleRefresh);
    context.subscriptions.push(watcher);
  };

  provider = new LogicsViewProvider(context, setupWatcher, agentsOutput);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LogicsViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("logics.refresh", () => provider.refresh()),
    vscode.commands.registerCommand("logics.refreshAgents", () => provider.refreshAgentsFromCommand()),
    vscode.commands.registerCommand("logics.selectAgent", () => provider.selectAgentFromPalette()),
    vscode.commands.registerCommand("logics.open", () => provider.openFromPalette()),
    vscode.commands.registerCommand("logics.promote", () => provider.promoteFromPalette()),
    vscode.commands.registerCommand("logics.newRequest", () => provider.createRequest()),
    vscode.commands.registerCommand("logics.createCompanionDoc", () => provider.createCompanionDocFromPalette())
  );

  setupWatcher();
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => setupWatcher())
  );
}

export function deactivate(): void {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  return folders[0].uri.fsPath;
}

function isExistingDirectory(value: string): boolean {
  try {
    return fs.existsSync(value) && fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

function areSamePath(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  if (process.platform === "win32") {
    return normalizedLeft.toLowerCase() === normalizedRight.toLowerCase();
  }
  return normalizedLeft === normalizedRight;
}

function hasLogicsSubmodule(root: string): boolean {
  const skillsDir = path.join(root, "logics", "skills");
  if (fs.existsSync(skillsDir)) {
    return true;
  }
  const gitmodulesPath = path.join(root, ".gitmodules");
  if (!fs.existsSync(gitmodulesPath)) {
    return false;
  }
  try {
    const content = fs.readFileSync(gitmodulesPath, "utf8");
    return content.includes("cdx-logics-kit") || content.includes("logics/skills");
  } catch {
    return false;
  }
}

type CreateItemConfig = { dir: string; prefix: string; label: string };

function getCreateConfig(kind: "request" | "backlog" | "task"): CreateItemConfig | null {
  if (kind === "request") {
    return { dir: "logics/request", prefix: "req_", label: "request" };
  }
  if (kind === "backlog") {
    return { dir: "logics/backlog", prefix: "item_", label: "backlog item" };
  }
  if (kind === "task") {
    return { dir: "logics/tasks", prefix: "task_", label: "task" };
  }
  return null;
}

function getNextSequence(dirPath: string, prefix: string): number {
  if (!fs.existsSync(dirPath)) {
    return 1;
  }
  const entries = fs.readdirSync(dirPath);
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped}(\\d+)`);
  let max = 0;
  for (const entry of entries) {
    const match = entry.match(regex);
    if (!match) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      max = Math.max(max, value);
    }
  }
  return max + 1;
}

function buildMinimalTemplate(id: string, title: string): string {
  return `## ${id} - ${title}
> From version: 0.0.0
> Understanding: 75%
> Confidence: 75%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update Understanding/Confidence and dependencies/references when you edit this doc.

# Needs
- TBD

# Context
- TBD

# Clarifications
- TBD

# Backlog
- (none yet)
`;
}

function updateMainHeadingId(filePath: string, oldId: string, newId: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith("## ")) {
      continue;
    }
    const match = line.match(/^##\s+(\S+)(\s*-\s*.*)?$/);
    if (!match) {
      break;
    }
    if (match[1] !== oldId) {
      break;
    }
    const suffix = match[2] ?? "";
    lines[i] = `## ${newId}${suffix}`;
    changed = true;
    break;
  }

  if (changed) {
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  }
}

function normalizeRelationPath(value: string, items: LogicsItem[], root: string): string | null {
  const trimmed = value.replace(/`/g, "").trim();
  if (!trimmed) {
    return null;
  }

  const byId = items.find((item) => item.id === trimmed);
  let normalized = byId ? byId.relPath : trimmed;
  normalized = normalized.replace(/\\/g, "/").replace(/^\.\//, "");

  if (path.isAbsolute(normalized)) {
    const rel = path.relative(root, normalized);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
      normalized = rel.replace(/\\/g, "/");
    }
  }

  return normalized;
}

function updateManagedReferencesForRename(
  root: string,
  oldRelPath: string,
  newRelPath: string,
  oldId: string,
  newId: string
): number {
  const files = collectManagedMarkdownFiles(root);
  let changedCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const updated = replaceManagedReferenceTokens(content, oldRelPath, newRelPath, oldId, newId);
    if (!updated.changed) {
      continue;
    }
    fs.writeFileSync(filePath, updated.content, "utf8");
    changedCount += 1;
  }

  return changedCount;
}

function collectManagedMarkdownFiles(root: string): string[] {
  const targets = getManagedDocDirectories(root);
  const files: string[] = [];

  for (const dir of targets) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    collectMarkdownFilesRecursive(dir, files);
  }

  return files;
}

function collectMarkdownFilesRecursive(dirPath: string, files: string[]): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFilesRecursive(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
}

function addLinkToSectionOnDisk(
  filePath: string,
  sectionTitle: "References" | "Used by",
  linkPath: string
): { changed: boolean } {
  const content = fs.readFileSync(filePath, "utf8");
  const updated = addLinkToSection(content, sectionTitle, linkPath);
  if (!updated.changed) {
    return { changed: false };
  }
  fs.writeFileSync(filePath, updated.content, "utf8");
  return { changed: true };
}

function updateIndicatorsOnDisk(filePath: string, updates: Record<string, string>): boolean {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const normalizedUpdates = Object.entries(updates)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => key.length > 0 && value.length > 0);
  if (!normalizedUpdates.length) {
    return false;
  }

  const indicatorIndexes = new Map<string, number>();
  let headingIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (headingIndex < 0 && line.startsWith("## ")) {
      headingIndex = i;
    }
    if (!line.startsWith(">")) {
      continue;
    }
    const trimmed = line.replace(/^>\s*/, "").trim();
    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim().toLowerCase();
    if (!indicatorIndexes.has(key)) {
      indicatorIndexes.set(key, i);
    }
  }

  let changed = false;
  const missing: Array<[string, string]> = [];
  for (const [key, value] of normalizedUpdates) {
    const targetLine = `> ${key}: ${value}`;
    const existingIndex = indicatorIndexes.get(key.toLowerCase());
    if (typeof existingIndex === "number") {
      if (lines[existingIndex] !== targetLine) {
        lines[existingIndex] = targetLine;
        changed = true;
      }
    } else {
      missing.push([key, value]);
    }
  }

  if (missing.length > 0) {
    let insertAt = headingIndex >= 0 ? headingIndex + 1 : 0;
    while (insertAt < lines.length && lines[insertAt].startsWith(">")) {
      insertAt += 1;
    }
    const insertion = missing.map(([key, value]) => `> ${key}: ${value}`);
    lines.splice(insertAt, 0, ...insertion);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  }
  return changed;
}

function getFlowManagerScriptPath(root: string): string | null {
  const scriptPath = path.join(
    root,
    "logics",
    "skills",
    "logics-flow-manager",
    "scripts",
    "logics_flow.py"
  );
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

function getCompanionDocScriptPath(root: string, kind: "product" | "architecture"): string | null {
  const scriptPath =
    kind === "product"
      ? path.join(
          root,
          "logics",
          "skills",
          "logics-product-brief-writer",
          "scripts",
          "new_product_brief.py"
        )
      : path.join(
          root,
          "logics",
          "skills",
          "logics-architecture-decision-writer",
          "scripts",
          "new_adr.py"
        );
  return fs.existsSync(scriptPath) ? scriptPath : null;
}

function findCreatedDocPathFromOutput(stdout: string): string {
  const match = stdout.match(/Wrote (.+)/);
  return match ? match[1].trim() : "";
}

async function openCreatedDocFromOutput(stdout: string): Promise<void> {
  const createdPath = findCreatedDocPathFromOutput(stdout);
  if (!createdPath) {
    return;
  }
  if (!fs.existsSync(createdPath)) {
    return;
  }
  const document = await vscode.workspace.openTextDocument(createdPath);
  await vscode.window.showTextDocument(document, { preview: false });
}

async function runPython(cwd: string, scriptPath: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve) => {
    execFile("python3", [scriptPath, ...args], { cwd }, (error, stdout, stderr) => {
      if (error) {
        void vscode.window.showErrorMessage(`Promotion failed: ${stderr || error.message}`);
        return resolve();
      }
      if (stdout.trim()) {
        void vscode.window.showInformationMessage(stdout.trim());
      }
      resolve();
    });
  });
}

async function runPythonWithOutput(
  cwd: string,
  scriptPath: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; error?: Error }> {
  return new Promise((resolve) => {
    execFile("python3", [scriptPath, ...args], { cwd }, (error, stdout, stderr) => {
      resolve({
        error: error ?? undefined,
        stdout: stdout || "",
        stderr: stderr || ""
      });
    });
  });
}

async function runGitWithOutput(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; error?: Error }> {
  return new Promise((resolve) => {
    execFile("git", args, { cwd }, (error, stdout, stderr) => {
      resolve({
        error: error ?? undefined,
        stdout: stdout || "",
        stderr: stderr || ""
      });
    });
  });
}

function escapeHtmlForHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
