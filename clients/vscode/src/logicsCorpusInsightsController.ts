import * as path from "path";
import * as vscode from "vscode";
import { buildLogicsCorpusInsightsHtml } from "./logicsCorpusInsightsHtml";
import { LogicsItem } from "./logicsIndexer";

type LogicsCorpusInsightsControllerOptions = {
  context: vscode.ExtensionContext;
  getActionRoot: () => Promise<string | null>;
  getItems: () => LogicsItem[];
  refresh: () => Promise<void>;
  openOnboarding: () => Promise<void>;
  openAbout: () => Promise<void>;
};

export class LogicsCorpusInsightsController {
  private corpusInsightsPanel?: vscode.WebviewPanel;

  constructor(private readonly options: LogicsCorpusInsightsControllerOptions) {}

  async openLogicsInsightsFromTools(): Promise<void> {
    const root = await this.options.getActionRoot();
    if (!root) {
      return;
    }
    await this.refreshLogicsInsightsPanel(root);
    this.getCorpusInsightsPanel().reveal(vscode.ViewColumn.Beside, true);
  }

  private async refreshLogicsInsightsPanel(root: string): Promise<void> {
    await this.options.refresh();
    const items = this.options.getItems();
    const panel = this.getCorpusInsightsPanel();
    panel.title = `Logics Insights: ${path.basename(root) || root}`;
    panel.webview.html = buildLogicsCorpusInsightsHtml({
      webview: panel.webview,
      root,
      items
    });
  }

  private getCorpusInsightsPanel(): vscode.WebviewPanel {
    if (this.corpusInsightsPanel) {
      return this.corpusInsightsPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "logics.corpusInsights",
      "Logics Insights",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.options.context.extensionUri]
      }
    );

    panel.webview.onDidReceiveMessage(async (message: unknown) => {
      if (!message || typeof message !== "object" || Array.isArray(message)) {
        return;
      }
      const type = (message as { type?: string }).type;
      if (type === "refresh-report") {
        const root = await this.options.getActionRoot();
        if (!root) {
          return;
        }
        await this.refreshLogicsInsightsPanel(root);
        return;
      }
      if (type === "open-onboarding") {
        await this.options.openOnboarding();
        return;
      }
      if (type === "about") {
        await this.options.openAbout();
      }
    });

    panel.onDidDispose(() => {
      if (this.corpusInsightsPanel === panel) {
        this.corpusInsightsPanel = undefined;
      }
    });

    this.corpusInsightsPanel = panel;
    return panel;
  }
}
