import * as vscode from "vscode";
import { LogicsViewProvider } from "./logicsViewProvider";

export function activate(context: vscode.ExtensionContext): void {
  let provider: LogicsViewProvider | undefined;
  let refreshTimer: NodeJS.Timeout | undefined;
  const watchers: vscode.FileSystemWatcher[] = [];
  const agentsOutput = vscode.window.createOutputChannel("Logics Agents");
  context.subscriptions.push(agentsOutput);
  context.subscriptions.push(
    new vscode.Disposable(() => {
      while (watchers.length > 0) {
        const watcher = watchers.pop();
        watcher?.dispose();
      }
    })
  );

  const scheduleRefresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      void provider?.refresh();
    }, 300);
  };

  const setupWatcher = () => {
    while (watchers.length > 0) {
      const watcher = watchers.pop();
      watcher?.dispose();
    }
    const root = provider?.getWatcherRoot();
    if (!root) {
      return;
    }
    const patterns = [
      "logics/**/*.{md,markdown,yaml,yml}",
      ".claude/**/*.{md,markdown,yml,yaml}",
      "logics.yaml",
      // Watch the git HEAD file so branch switches trigger a refresh and
      // clear stale bootstrap-state assumptions tied to the previous branch.
      ".git/HEAD"
    ];
    for (const rawPattern of patterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, rawPattern));
      watcher.onDidChange(scheduleRefresh);
      watcher.onDidCreate(scheduleRefresh);
      watcher.onDidDelete(scheduleRefresh);
      watchers.push(watcher);
      context.subscriptions.push(watcher);
    }
  };

  provider = new LogicsViewProvider(context, setupWatcher, agentsOutput);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(LogicsViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("logics.refresh", () => provider?.refresh()),
    vscode.commands.registerCommand("logics.refreshAgents", () => provider?.refreshAgentsFromCommand()),
    vscode.commands.registerCommand("logics.selectAgent", () => provider?.selectAgentFromPalette()),
    vscode.commands.registerCommand("logics.open", () => provider?.openFromPalette()),
    vscode.commands.registerCommand("logics.promote", () => provider?.promoteFromPalette()),
    vscode.commands.registerCommand("logics.newRequest", () => provider?.createRequest()),
    vscode.commands.registerCommand("logics.createCompanionDoc", () => provider?.createCompanionDocFromPalette()),
    vscode.commands.registerCommand("logics.checkEnvironment", () => provider?.checkEnvironmentFromCommand()),
    vscode.commands.registerCommand("logics.openHybridInsights", () => provider?.openHybridInsightsFromCommand()),
    vscode.commands.registerCommand("logics.assistTriage", () => provider?.triageWorkflowDocFromCommand()),
    vscode.commands.registerCommand("logics.assistDiffRisk", () => provider?.assessDiffRiskFromCommand()),
    vscode.commands.registerCommand("logics.assistValidationChecklist", () => provider?.buildValidationChecklistFromCommand()),
    vscode.commands.registerCommand("logics.assistDocConsistency", () => provider?.reviewDocConsistencyFromCommand())
  );

  setupWatcher();
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => setupWatcher()));
}

export function deactivate(): void {}
