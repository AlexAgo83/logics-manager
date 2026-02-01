import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { canPromote, indexLogics, isRequestUsed, LogicsItem, promotionCommand } from "./logicsIndexer";
import { execFile } from "child_process";

class LogicsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "logics.orchestrator";

  private view?: vscode.WebviewView;
  private items: LogicsItem[] = [];
  private bootstrapPrompted = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

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
        case "create-item":
          await this.createItem(message.kind);
          break;
        case "new-request":
          await this.createRequest();
          break;
        case "fix-docs":
          await this.fixDocs();
          break;
        default:
          break;
      }
    });

  }

  async refresh(selectedId?: string): Promise<void> {
    const root = getWorkspaceRoot();
    if (!root) {
      this.items = [];
      this.postData({ error: "Open a workspace that contains a logics/ folder." });
      return;
    }
    if (!fs.existsSync(path.join(root, "logics"))) {
      this.items = [];
      this.postData({ error: "Open a workspace that contains a logics/ folder." });
      await this.maybeOfferBootstrap(root);
      return;
    }

    this.items = indexLogics(root);
    this.postData({ items: this.items, root, selectedId });
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

  async createRequest(): Promise<void> {
    const root = getWorkspaceRoot();
    if (!root) {
      void vscode.window.showErrorMessage("No workspace root found.");
      return;
    }

    const title = await vscode.window.showInputBox({
      title: "New Logics request",
      prompt: "Title for the request"
    });
    if (!title) {
      return;
    }

    const scriptPath = path.join(
      root,
      "logics",
      "skills",
      "logics-flow-manager",
      "scripts",
      "logics_flow.py"
    );

    if (!fs.existsSync(scriptPath)) {
      void vscode.window.showErrorMessage("Logics flow script not found in logics/skills.");
      return;
    }

    const result = await runPythonWithOutput(root, scriptPath, ["new", "request", "--title", title]);
    if (result.error) {
      void vscode.window.showErrorMessage(`Request creation failed: ${result.stderr || result.error.message}`);
      return;
    }

    const match = result.stdout.match(/Wrote (.+)/);
    if (match) {
      const createdPath = match[1].trim();
      if (fs.existsSync(createdPath)) {
        const document = await vscode.workspace.openTextDocument(createdPath);
        await vscode.window.showTextDocument(document, { preview: false });
      }
    }
    await this.refresh();
  }

  async createItem(kind: "request" | "backlog" | "task"): Promise<void> {
    const root = getWorkspaceRoot();
    if (!root) {
      void vscode.window.showErrorMessage("No workspace root found.");
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

    const logicsRoot = path.join(root, "logics");
    if (!fs.existsSync(logicsRoot)) {
      fs.mkdirSync(logicsRoot, { recursive: true });
    }

    const dirPath = path.join(root, config.dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const nextId = getNextSequence(dirPath, config.prefix);
    const slug = slugify(title);
    const baseId = `${config.prefix}${String(nextId).padStart(3, "0")}`;
    const slugPart = slug ? `_${slug}` : "";
    const fileId = `${baseId}${slugPart}`;
    const filePath = path.join(dirPath, `${fileId}.md`);

    if (fs.existsSync(filePath)) {
      void vscode.window.showErrorMessage("A file with that name already exists.");
      return;
    }

    const template = buildMinimalTemplate(fileId, title);
    fs.writeFileSync(filePath, template, "utf8");

    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document, { preview: false });
    await this.refresh(fileId);
  }

  async fixDocs(): Promise<void> {
    const root = getWorkspaceRoot();
    if (!root) {
      void vscode.window.showErrorMessage("No workspace root found.");
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

  private async maybeOfferBootstrap(root: string): Promise<void> {
    if (this.bootstrapPrompted) {
      return;
    }
    if (hasLogicsSubmodule(root)) {
      return;
    }
    this.bootstrapPrompted = true;

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
      void vscode.window.showErrorMessage("Bootstrap requires a git repository (run git init first).");
      return;
    }

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

    void vscode.window.showInformationMessage("Logics bootstrapped. Refreshing.");
    await this.refresh();
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
      const uri = vscode.Uri.file(item.path);
      await vscode.commands.executeCommand("markdown.showPreview", uri);
      await vscode.commands.executeCommand("workbench.action.keepEditor");
    } catch (error) {
      void vscode.window.showErrorMessage("Could not open Markdown preview. Opening in Edit.");
      await this.openItem(id);
    }
  }

  private async promoteItem(id: string): Promise<void> {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const root = getWorkspaceRoot();
    if (!root) {
      void vscode.window.showErrorMessage("No workspace root found.");
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

    const scriptPath = path.join(
      root,
      "logics",
      "skills",
      "logics-flow-manager",
      "scripts",
      "logics_flow.py"
    );

    if (!fs.existsSync(scriptPath)) {
      void vscode.window.showErrorMessage("Logics flow script not found in logics/skills.");
      return;
    }

    await runPython(root, scriptPath, ["promote", promotion, item.path]);
    await this.refresh();
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
      <div class="toolbar__options">
        <label class="toggle">
          <input type="checkbox" id="hide-used-requests" />
          <span>Hide used requests</span>
        </label>
        <label class="toggle">
          <input type="checkbox" id="hide-complete" />
          <span>Hide completed</span>
        </label>
      </div>
      <div class="toolbar__buttons">
        <button class="btn" data-action="fix-docs">Fix Logics</button>
        <button class="btn" data-action="refresh">Refresh</button>
      </div>
    </div>
  </div>
  <div class="layout">
    <div class="board" id="board"></div>
    <aside class="details" id="details">
      <div class="details__header">
        <div class="details__header-title" id="details-title">Details</div>
        <button class="details__toggle" id="details-toggle" aria-label="Collapse details" aria-expanded="true">
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
        <button class="btn" data-action="promote" disabled>Promote</button>
        <button class="btn" data-action="open" disabled>Edit</button>
        <button class="btn" data-action="read" disabled>Read</button>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LogicsViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LogicsViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("logics.refresh", () => provider.refresh()),
    vscode.commands.registerCommand("logics.open", () => provider.openFromPalette()),
    vscode.commands.registerCommand("logics.promote", () => provider.promoteFromPalette()),
    vscode.commands.registerCommand("logics.newRequest", () => provider.createRequest())
  );
}

export function deactivate(): void {}

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  return folders[0].uri.fsPath;
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

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, 40);
}

function buildMinimalTemplate(id: string, title: string): string {
  return `## ${id} - ${title}
> From version: 0.0.0
> Understanding: 75%
> Confidence: 75%

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

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
