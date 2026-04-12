/* eslint-disable @typescript-eslint/no-explicit-any -- environment helpers operate through dynamic provider bindings and output channels. */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { inspectLogicsBootstrapState } from "./logicsProviderUtils";
import { RuntimeLaunchersSnapshot } from "./runtimeLaunchers";
import { LogicsEnvironmentSnapshot } from "./logicsEnvironment";

type LogicsViewProviderEnvironmentHost = {
  hybridAssistController: {
    buildProviderRemediationQuickPickItem(root: string): Promise<(vscode.QuickPickItem & { action: () => Promise<void> }) | null>;
  };
  buildLogicsYamlBlocksQuickPickItem(root: string): (vscode.QuickPickItem & { action: () => Promise<void> }) | null;
  buildMissingEnvLocalQuickPickItem(root: string): (vscode.QuickPickItem & { action: () => Promise<void> }) | null;
  environmentOutput: {
    clear(): void;
    appendLine(value: string): void;
    show(preserveFocus?: boolean): void;
  };
};

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
  },
  hasCodex: false,
  hasClaude: false
};

export async function shouldRecommendCheckEnvironment(
  this: LogicsViewProviderEnvironmentHost,
  root: string,
  snapshot: LogicsEnvironmentSnapshot | null,
  bootstrapState: ReturnType<typeof inspectLogicsBootstrapState> | null,
  launchers: RuntimeLaunchersSnapshot = UNAVAILABLE_LAUNCHER_STATE
): Promise<boolean> {
  if (bootstrapState?.canBootstrap) {
    return true;
  }
  if (!snapshot) {
    return true;
  }
  if (snapshot.repositoryState !== "ready" || snapshot.missingWorkflowDirs.length > 0) {
    return true;
  }
  if (!snapshot.git.available || !snapshot.python.available) {
    return true;
  }
  if (launchers.hasCodex && snapshot.codexOverlay.status !== "healthy" && snapshot.codexOverlay.status !== "warning") {
    return true;
  }
  if (launchers.hasClaude && snapshot.claudeGlobalKit?.status && snapshot.claudeGlobalKit.status !== "healthy") {
    return true;
  }
  if (
    launchers.hasClaude &&
    (!snapshot.hybridRuntime || snapshot.hybridRuntime.state !== "ready" || !snapshot.hybridRuntime.claudeBridgeAvailable)
  ) {
    return true;
  }
  if (await this.hybridAssistController.buildProviderRemediationQuickPickItem(root)) {
    return true;
  }
  if (this.buildLogicsYamlBlocksQuickPickItem(root) || this.buildMissingEnvLocalQuickPickItem(root)) {
    return true;
  }
  return false;
}

export function getEnvironmentOverallState(
  this: LogicsViewProviderEnvironmentHost,
  snapshot: LogicsEnvironmentSnapshot,
  hybridRuntime: NonNullable<LogicsEnvironmentSnapshot["hybridRuntime"]>,
  actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
  launchers: RuntimeLaunchersSnapshot = UNAVAILABLE_LAUNCHER_STATE
): "Blocked" | "Degraded" | "Healthy" {
  const hasBlockingIssue =
    !snapshot.root ||
    snapshot.repositoryState === "missing-logics" ||
    snapshot.repositoryState === "missing-kit" ||
    snapshot.repositoryState === "missing-flow-manager" ||
    !snapshot.git.available ||
    !snapshot.python.available ||
    hybridRuntime.state === "unavailable";
  if (hasBlockingIssue) {
    return "Blocked";
  }
  const hasDegradedIssue =
    snapshot.missingWorkflowDirs.length > 0 ||
    (launchers.hasCodex && snapshot.codexOverlay.status !== "healthy") ||
    (launchers.hasClaude &&
      (snapshot.claudeGlobalKit?.status === "stale" ||
        snapshot.claudeGlobalKit?.status === "missing-overlay" ||
        snapshot.claudeGlobalKit?.status === "missing-manager")) ||
    hybridRuntime.state === "degraded" ||
    (launchers.hasClaude && !hybridRuntime.claudeBridgeAvailable) ||
    actions.length > 0;
  return hasDegradedIssue ? "Degraded" : "Healthy";
}

export function getEnvironmentSummaryDescription(
  this: LogicsViewProviderEnvironmentHost,
  snapshot: LogicsEnvironmentSnapshot,
  hybridRuntime: NonNullable<LogicsEnvironmentSnapshot["hybridRuntime"]>,
  actions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
  launchers: RuntimeLaunchersSnapshot = UNAVAILABLE_LAUNCHER_STATE
): string {
  const blockedCount = [
    !snapshot.root,
    snapshot.repositoryState === "missing-logics",
    snapshot.repositoryState === "missing-kit",
    snapshot.repositoryState === "missing-flow-manager",
    !snapshot.git.available,
    !snapshot.python.available,
    hybridRuntime.state === "unavailable"
  ].filter(Boolean).length;
  const degradedCount = [
    snapshot.missingWorkflowDirs.length > 0,
    launchers.hasCodex && snapshot.codexOverlay.status !== "healthy",
    launchers.hasClaude &&
      (snapshot.claudeGlobalKit?.status === "stale" ||
        snapshot.claudeGlobalKit?.status === "missing-overlay" ||
        snapshot.claudeGlobalKit?.status === "missing-manager"),
    hybridRuntime.state === "degraded",
    launchers.hasClaude && !hybridRuntime.claudeBridgeAvailable
  ].filter(Boolean).length;
  if (blockedCount === 0 && degradedCount === 0 && actions.length === 0) {
    return "Environment healthy - no action required.";
  }
  const parts = [
    blockedCount > 0 ? `${blockedCount} blocking issue(s)` : "",
    degradedCount > 0 ? `${degradedCount} degraded state(s)` : "",
    actions.length > 0 ? `${actions.length} recommended action(s)` : ""
  ].filter((value) => value.length > 0);
  return `${parts.join(", ")}. ${actions.length > 0 ? "Select a fix below or open the detailed report." : "Review current status below."}`;
}

export function writeEnvironmentDiagnosticReport(
  this: LogicsViewProviderEnvironmentHost,
  root: string | null,
  snapshot: LogicsEnvironmentSnapshot,
  recommendedActions: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
  statusItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>,
  detailItems: Array<vscode.QuickPickItem & { action?: () => Promise<void> }>
): void {
  this.environmentOutput.clear();
  this.environmentOutput.appendLine(`Logics environment diagnostics @ ${new Date().toISOString()}`);
  this.environmentOutput.appendLine(`Root: ${root ?? "(none selected)"}`);
  this.environmentOutput.appendLine("");
  this.environmentOutput.appendLine("[Summary]");
  for (const item of statusItems.slice(0, 1)) {
    this.environmentOutput.appendLine(`- ${item.label}`);
    if (item.description) {
      this.environmentOutput.appendLine(`  ${item.description}`);
    }
  }
  if (recommendedActions.length > 0) {
    this.environmentOutput.appendLine("");
    this.environmentOutput.appendLine("[Recommended actions]");
    for (const item of recommendedActions) {
      this.environmentOutput.appendLine(`- ${item.label}`);
      if (item.description) {
        this.environmentOutput.appendLine(`  ${item.description}`);
      }
    }
  }
  this.environmentOutput.appendLine("");
  this.environmentOutput.appendLine("[Current status]");
  for (const item of statusItems.slice(1)) {
    this.environmentOutput.appendLine(`- ${item.label}`);
    if (item.description) {
      this.environmentOutput.appendLine(`  ${item.description}`);
    }
  }
  this.environmentOutput.appendLine("");
  this.environmentOutput.appendLine("[Technical details]");
  for (const item of detailItems.filter((entry) => entry.label !== "Open detailed diagnostic report")) {
    this.environmentOutput.appendLine(`- ${item.label}`);
    if (item.description) {
      this.environmentOutput.appendLine(`  ${item.description}`);
    }
  }
  this.environmentOutput.appendLine("");
  this.environmentOutput.appendLine("[Snapshot]");
  this.environmentOutput.appendLine(JSON.stringify(snapshot, null, 2));
  this.environmentOutput.show(true);
}

export function ensureLogicsCacheDir(this: unknown, root: string): void {
  const cacheDir = path.join(root, "logics", ".cache");
  if (!fs.existsSync(cacheDir)) {
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch {
      // non-blocking — runtime will surface errors if it can't write there
    }
  }
}
