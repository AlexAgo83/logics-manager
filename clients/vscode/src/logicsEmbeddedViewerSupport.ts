import * as path from "path";
import * as vscode from "vscode";
import { buildEmbeddedViewerHtml } from "./logicsWebviewHtml";
import * as viewProviderSupport from "./logicsViewProviderSupport";

type EmbeddedViewerHost = {
  view?: vscode.WebviewView;
  embeddedViewerUrl?: string;
  embeddedViewerRoot?: string;
  viewerServerManager: {
    getOrStart(root: string, focus?: string): Promise<{ url: string }>;
    stop(root: string): void;
  };
};

export function installEmbeddedViewerBindings(host: EmbeddedViewerHost): void {
  const target = host as EmbeddedViewerHost & {
    renderEmbeddedViewer: typeof renderEmbeddedViewer;
    restartEmbeddedViewer: typeof restartEmbeddedViewer;
    openEmbeddedViewerFromCommand: typeof openEmbeddedViewerFromCommand;
    restartEmbeddedViewerFromCommand: typeof restartEmbeddedViewerFromCommand;
    openEmbeddedViewerExternalFromCommand: typeof openEmbeddedViewerExternalFromCommand;
    focusCurrentLogicsDocumentFromCommand: typeof focusCurrentLogicsDocumentFromCommand;
  };
  target.renderEmbeddedViewer = renderEmbeddedViewer.bind(host);
  target.restartEmbeddedViewer = restartEmbeddedViewer.bind(host);
  target.openEmbeddedViewerFromCommand = openEmbeddedViewerFromCommand.bind(host);
  target.restartEmbeddedViewerFromCommand = restartEmbeddedViewerFromCommand.bind(host);
  target.openEmbeddedViewerExternalFromCommand = openEmbeddedViewerExternalFromCommand.bind(host);
  target.focusCurrentLogicsDocumentFromCommand = focusCurrentLogicsDocumentFromCommand.bind(host);
}

async function renderEmbeddedViewer(this: EmbeddedViewerHost, focus?: string): Promise<void> {
  const view = this.view;
  if (!view) return;
  const { root, invalidOverridePath } = viewProviderSupport.resolveProjectRoot.call(this as never);
  if (!root) {
    view.webview.html = buildEmbeddedViewerHtml(view.webview, {
      kind: "error",
      message: invalidOverridePath
        ? `Configured project root not found: ${invalidOverridePath}.`
        : "Open a workspace or set a project root from the Logics commands."
    });
    return;
  }
  if (!focus && this.embeddedViewerUrl && this.embeddedViewerRoot === root) {
    return;
  }
  view.webview.html = buildEmbeddedViewerHtml(view.webview, { kind: "loading", message: `Starting viewer for ${root}` });
  try {
    const server = await this.viewerServerManager.getOrStart(root, focus);
    if (this.view !== view) return;
    this.embeddedViewerUrl = server.url;
    this.embeddedViewerRoot = root;
    view.webview.html = buildEmbeddedViewerHtml(view.webview, { kind: "ready", url: server.url, root });
  } catch (error) {
    view.webview.html = buildEmbeddedViewerHtml(view.webview, {
      kind: "error",
      message: "Could not start the embedded Logics viewer.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

async function restartEmbeddedViewer(this: EmbeddedViewerHost): Promise<void> {
  const { root } = viewProviderSupport.resolveProjectRoot.call(this as never);
  if (root) this.viewerServerManager.stop(root);
  this.embeddedViewerUrl = undefined;
  this.embeddedViewerRoot = undefined;
  await renderEmbeddedViewer.call(this);
}

async function openEmbeddedViewerFromCommand(this: EmbeddedViewerHost): Promise<void> {
  await renderEmbeddedViewer.call(this);
}

async function restartEmbeddedViewerFromCommand(this: EmbeddedViewerHost): Promise<void> {
  await restartEmbeddedViewer.call(this);
}

async function openEmbeddedViewerExternalFromCommand(this: EmbeddedViewerHost): Promise<void> {
  const { root } = viewProviderSupport.resolveProjectRoot.call(this as never);
  if (!root) {
    void vscode.window.showErrorMessage("No project root found. Open a workspace or set a project root first.");
    return;
  }
  try {
    const server = await this.viewerServerManager.getOrStart(root);
    this.embeddedViewerUrl = server.url;
    await vscode.env.openExternal(vscode.Uri.parse(server.url));
  } catch (error) {
    void vscode.window.showErrorMessage(`Could not open Logics viewer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function focusCurrentLogicsDocumentFromCommand(this: EmbeddedViewerHost): Promise<void> {
  const { root } = viewProviderSupport.resolveProjectRoot.call(this as never);
  const activePath = vscode.window.activeTextEditor?.document.uri.fsPath;
  if (!root || !activePath) {
    void vscode.window.showWarningMessage("Open a Logics document before focusing the viewer.");
    return;
  }
  const ref = path.basename(activePath).replace(/\.(md|markdown)$/i, "");
  if (!/^(req|item|task)_\d+/.test(ref)) {
    void vscode.window.showWarningMessage("The active editor is not a request, backlog item, or task document.");
    return;
  }
  await renderEmbeddedViewer.call(this, ref);
}
