import * as path from "path";
import * as vscode from "vscode";
import { CodexOverlaySnapshot } from "./logicsCodexWorkspace";

export async function maybeShowReadyCodexOverlayHandoff(
  root: string,
  trigger: string,
  overlay: CodexOverlaySnapshot
): Promise<void> {
  if ((overlay.status !== "healthy" && overlay.status !== "warning") || !overlay.runCommand) {
    return;
  }

  const launchAction = "Launch Codex in Terminal";
  const copyAction = "Copy Codex Launch Command";
  const choice = await vscode.window.showInformationMessage(
    `Global Codex kit is ready after ${trigger}. Launch Codex normally to use the published Logics skills.`,
    launchAction,
    copyAction
  );
  if (choice === launchAction) {
    launchCodexOverlayTerminal(root, overlay.runCommand);
    return;
  }
  if (choice === copyAction) {
    await vscode.env.clipboard.writeText(overlay.runCommand);
    void vscode.window.showInformationMessage("Codex launch command copied to clipboard.");
  }
}

export function launchCodexOverlayTerminal(root: string, runCommand: string): void {
  launchAssistantTerminal(root, `Codex: ${path.basename(root)}`, runCommand);
}

export function launchClaudeTerminal(root: string, runCommand: string): void {
  launchAssistantTerminal(root, `Claude: ${path.basename(root)}`, runCommand);
}

function launchAssistantTerminal(root: string, name: string, runCommand: string): void {
  const terminal = vscode.window.createTerminal({
    name,
    cwd: root
  });
  terminal.show(true);
  terminal.sendText(runCommand, true);
}
