import * as vscode from "vscode";
import { LogicsViewProvider } from "./logicsViewProvider";

export function activate(context: vscode.ExtensionContext): void {
  let provider: LogicsViewProvider | undefined;
  let refreshTimer: NodeJS.Timeout | undefined;
  let watcher: vscode.FileSystemWatcher | undefined;
  const agentsOutput = vscode.window.createOutputChannel("Logics Agents");
  context.subscriptions.push(agentsOutput);
  context.subscriptions.push(
    new vscode.Disposable(() => {
      if (watcher) {
        watcher.dispose();
        watcher = undefined;
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
    vscode.commands.registerCommand("logics.checkEnvironment", () => provider?.checkEnvironmentFromCommand())
  );

  setupWatcher();
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => setupWatcher()));
}

export function deactivate(): void {}
