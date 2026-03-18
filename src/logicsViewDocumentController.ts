import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AgentDefinition, AgentRegistrySnapshot } from "./agentRegistry";
import { buildReadPreviewHtml } from "./logicsReadPreviewHtml";
import { normalizeEntrySuffix, parseRenameTarget, validateRenameSuffix } from "./logicsDocMaintenance";
import { canPromote, isRequestProcessed, LogicsItem, promotionCommand } from "./logicsIndexer";
import { buildMissingPythonMessage, isMissingPythonFailureDetail } from "./pythonRuntime";
import {
  addLinkToSectionOnDisk,
  findCreatedDocPathFromOutput,
  getCompanionDocScriptPath,
  getCreateConfig,
  getFlowManagerScriptPath,
  normalizeRelationPath,
  openCreatedDocFromOutput,
  runPythonWithOutput,
  updateMainHeadingId,
  updateManagedReferencesForRename
} from "./logicsProviderUtils";
import { buildGuidedRequestPrompt } from "./workflowSupport";

type CompanionKind = "product" | "architecture";
type AgentRefreshMode = "silent" | "notify";

type ControllerOptions = {
  context: vscode.ExtensionContext;
  agentsOutput: vscode.OutputChannel;
  getItems: () => LogicsItem[];
  getAgentRegistry: () => AgentRegistrySnapshot;
  getActionRoot: () => Promise<string | null>;
  maybeOfferBootstrap: (root: string) => Promise<void>;
  refresh: (selectedId?: string) => Promise<void>;
  refreshAgents: (mode: AgentRefreshMode, root: string) => Promise<void>;
  findRequestAuthoringAgent: () => AgentDefinition | undefined;
  setActiveAgent: (agentId: string | null) => Promise<void>;
  injectPromptIntoCodexChat: (
    prompt: string,
    options?: {
      codexCopiedMessage?: string;
      fallbackCopiedMessage?: string;
    }
  ) => Promise<void>;
  getReadPreviewPanel: () => vscode.WebviewPanel;
};

export class LogicsViewDocumentController {
  constructor(private readonly options: ControllerOptions) {}

  async createRequest(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.options.maybeOfferBootstrap(root);
      return;
    }

    const title = await vscode.window.showInputBox({
      title: "New Logics request",
      prompt: "Title for the request"
    });
    if (!title) {
      return;
    }

    const scriptPath = await this.ensureFlowManagerScript(root);
    if (!scriptPath) {
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["new", "request", "--title", title]);
    if (result.error) {
      void vscode.window.showErrorMessage(this.buildScriptActionErrorMessage("Request creation", result));
      return;
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.options.refresh();
  }

  async startGuidedRequestFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.options.maybeOfferBootstrap(root);
      return;
    }

    await this.options.refreshAgents("silent", root);
    const agent = this.options.findRequestAuthoringAgent();
    if (!agent) {
      const registry = this.options.getAgentRegistry();
      const issueHint = registry.issues.length > 0 ? " Check 'Logics Agents' output for validation errors." : "";
      void vscode.window.showWarningMessage(`No request-authoring agent found in logics/skills.${issueHint}`);
      if (registry.issues.length > 0) {
        this.options.agentsOutput.show(true);
      }
      return;
    }

    await this.options.setActiveAgent(agent.id);
    const prompt = buildGuidedRequestPrompt(agent.defaultPrompt);
    await this.options.injectPromptIntoCodexChat(prompt, {
      codexCopiedMessage: "Codex opened. New-request prompt copied to clipboard. Paste it in the Codex composer.",
      fallbackCopiedMessage: "Could not inject the new-request prompt into Codex chat."
    });
    void vscode.window.showInformationMessage(`Active Logics agent: ${agent.displayName} (${agent.id})`);
    await this.options.refresh();
  }

  async createItem(kind: "request" | "backlog" | "task"): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.options.maybeOfferBootstrap(root);
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

    const scriptPath = await this.ensureFlowManagerScript(root);
    if (!scriptPath) {
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["new", kind, "--title", title]);
    if (result.error) {
      void vscode.window.showErrorMessage(this.buildScriptActionErrorMessage("Logics document creation", result));
      return;
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.options.refresh();
  }

  async createCompanionDoc(sourceId: string, preferredKind?: CompanionKind): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      void vscode.window.showErrorMessage(`No logics/ folder found in: ${root}.`);
      await this.options.maybeOfferBootstrap(root);
      return;
    }

    const sourceItem = this.items.find((entry) => entry.id === sourceId);
    if (!sourceItem) {
      void vscode.window.showErrorMessage("Select a Logics item before creating a companion doc.");
      return;
    }

    const allKinds: Array<{ label: string; description: string; value: CompanionKind }> = [
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
    ];
    const suggestedKinds = this.getSuggestedCompanionDocKinds(sourceItem, allKinds);
    const availableKinds = suggestedKinds.length > 0 ? suggestedKinds : allKinds;

    const kindPick =
      preferredKind && availableKinds.some((kind) => kind.value === preferredKind)
        ? availableKinds.find((kind) => kind.value === preferredKind)
        : availableKinds.length === 1
          ? availableKinds[0]
          : await vscode.window.showQuickPick(availableKinds, {
              title: "Create companion doc",
              placeHolder: `Choose the companion doc type for ${sourceItem.id}`
            });
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
      void vscode.window.showErrorMessage(this.buildScriptActionErrorMessage(`${kindPick.label} creation`, result));
      return;
    }

    const createdPath = findCreatedDocPathFromOutput(result.stdout);
    if (createdPath && fs.existsSync(createdPath)) {
      const createdRelPath = path.relative(root, createdPath).replace(/\\/g, "/");
      addLinkToSectionOnDisk(sourceItem.path, "References", createdRelPath);
      addLinkToSectionOnDisk(createdPath, "References", sourceItem.relPath);
    }

    await openCreatedDocFromOutput(result.stdout);
    await this.options.refresh(sourceItem.id);
  }

  async createCompanionDocFromPalette(preferredSourceId?: string, preferredKind?: CompanionKind): Promise<void> {
    const sourceItem = await this.resolveCompanionDocSource(preferredSourceId);
    if (!sourceItem) {
      return;
    }
    await this.createCompanionDoc(sourceItem.id, preferredKind);
  }

  async fixDocs(): Promise<void> {
    const root = await this.options.getActionRoot();
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

    const scriptPath = path.join(root, "logics", "skills", "logics-doc-fixer", "scripts", "fix_logics_docs.py");
    if (!fs.existsSync(scriptPath)) {
      void vscode.window.showErrorMessage("Logics doc fixer script not found in logics/skills.");
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["--write"]);
    if (result.error) {
      void vscode.window.showErrorMessage(this.buildScriptActionErrorMessage("Logics doc fixer", result));
      return;
    }

    void vscode.window.showInformationMessage("Logics docs fixer completed.");
    await this.options.refresh();
  }

  async openItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    const document = await vscode.workspace.openTextDocument(item.path);
    await vscode.window.showTextDocument(document, { preview: false });
  }

  async readItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    try {
      const markdown = fs.readFileSync(item.path, "utf8");
      const panel = this.options.getReadPreviewPanel();
      panel.title = `Read: ${item.id}`;
      panel.webview.html = buildReadPreviewHtml({
        title: item.title,
        itemId: item.id,
        relPath: item.relPath,
        markdown,
        webview: panel.webview,
        extensionPath: this.options.context.extensionPath
      });
      panel.reveal(vscode.ViewColumn.Beside, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`Could not open rendered Markdown preview (${message}). Opening in Edit.`);
      await this.openItem(id);
    }
  }

  async promoteItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }

    const promotion = promotionCommand(item.stage);
    if (!promotion) {
      void vscode.window.showInformationMessage("Promotion is only available for request or backlog items.");
      return;
    }
    if (isRequestProcessed(item, this.items)) {
      void vscode.window.showInformationMessage("This request has already been processed and cannot be promoted.");
      return;
    }
    if (item.isPromoted) {
      void vscode.window.showInformationMessage("This item has already been promoted.");
      return;
    }

    const scriptPath = await this.ensureFlowManagerScript(root);
    if (!scriptPath) {
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["promote", promotion, item.path]);
    if (result.error) {
      void vscode.window.showErrorMessage(this.buildScriptActionErrorMessage("Promotion", result));
      return;
    }
    if (result.stdout.trim()) {
      void vscode.window.showInformationMessage(result.stdout.trim());
    }
    await this.options.refresh();
  }

  async addReference(id: string): Promise<void> {
    await this.addLinksToSection(id, "References", "reference");
  }

  async addUsedBy(id: string): Promise<void> {
    await this.addLinksToSection(id, "Used by", "used-by link");
  }

  async renameItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = await this.options.getActionRoot();
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
      await this.options.refresh(newId);
      return;
    }

    void vscode.window.showInformationMessage(`Renamed entry to ${newId}.`);
    await this.options.refresh(newId);
  }

  private get items(): LogicsItem[] {
    return this.options.getItems();
  }

  private async ensureFlowManagerScript(root: string): Promise<string | null> {
    let scriptPath = getFlowManagerScriptPath(root);
    if (scriptPath) {
      return scriptPath;
    }

    await this.options.maybeOfferBootstrap(root);
    scriptPath = getFlowManagerScriptPath(root);
    if (scriptPath) {
      return scriptPath;
    }

    void vscode.window.showErrorMessage(
      "Logics flow script not found at logics/skills/logics-flow-manager/scripts/logics_flow.py. Run Bootstrap Logics to install logics/skills."
    );
    return null;
  }

  private buildScriptActionErrorMessage(
    actionLabel: string,
    result: { stdout: string; stderr: string; error?: Error }
  ): string {
    const detail = `${result.stderr}\n${result.stdout}\n${result.error?.message || ""}`.trim();
    if (isMissingPythonFailureDetail(detail)) {
      return `${actionLabel} requires Python 3. ${buildMissingPythonMessage()} Read-only Logics browsing remains available.`;
    }
    return `${actionLabel} failed: ${result.stderr || result.error?.message || "Unknown error."}`;
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
      await this.options.refresh();
    }

    const sourceCandidates = this.items.filter((item) =>
      item.stage === "request" || item.stage === "backlog" || item.stage === "task"
    );
    return this.pickItem(sourceCandidates, "Choose the source item for the companion doc");
  }

  private getSuggestedCompanionDocKinds(
    sourceItem: LogicsItem,
    allKinds: Array<{ label: string; description: string; value: CompanionKind }>
  ): Array<{ label: string; description: string; value: CompanionKind }> {
    const linkedStages = new Set<CompanionKind>();

    for (const reference of sourceItem.references) {
      const candidate = this.resolveManagedItemForCompanionDoc(reference.path);
      if (candidate?.stage === "product" || candidate?.stage === "architecture") {
        linkedStages.add(candidate.stage);
      }
    }

    for (const usage of sourceItem.usedBy) {
      if (usage.stage === "product" || usage.stage === "architecture") {
        linkedStages.add(usage.stage);
        continue;
      }
      const candidate = this.resolveManagedItemForCompanionDoc(usage.relPath || usage.id);
      if (candidate?.stage === "product" || candidate?.stage === "architecture") {
        linkedStages.add(candidate.stage);
      }
    }

    return allKinds.filter((kind) => !linkedStages.has(kind.value));
  }

  private resolveManagedItemForCompanionDoc(reference: string): LogicsItem | undefined {
    const normalized = String(reference || "")
      .replace(/\\/g, "/")
      .replace(/^\.?\//, "")
      .trim();
    if (!normalized) {
      return undefined;
    }
    const fileStem = path.basename(normalized, ".md");
    return this.items.find((item) => item.relPath === normalized || item.id === normalized || item.id === fileStem);
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

    const root = await this.options.getActionRoot();
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
    await this.options.refresh(item.id);
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
}
