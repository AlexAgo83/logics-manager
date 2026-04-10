import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEnvironmentSnapshot } from "./logicsViewProviderTestUtils";
import * as viewProviderSupport from "../src/logicsViewProviderSupport";
import { updateIndicatorsOnDisk } from "../src/logicsProviderUtils";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showQuickPick: vi.fn(),
  showWarningMessage: vi.fn(),
  withProgress: vi.fn(),
  createWebviewPanel: vi.fn(),
  createTerminal: vi.fn(),
  openExternal: vi.fn(),
  clipboardWriteText: vi.fn(),
  getCommands: vi.fn(),
  executeCommand: vi.fn(),
  globalStateGet: vi.fn(),
  globalStateUpdate: vi.fn(),
  workspaceStateGet: vi.fn(),
  workspaceStateUpdate: vi.fn(),
  buildLogicsKitUpdateCommand: vi.fn(),
  detectDangerousGitignorePatterns: vi.fn(),
  detectKitInstallType: vi.fn(),
  inspectLogicsKitSubmodule: vi.fn(),
  inspectLogicsBootstrapState: vi.fn(),
  runGitWithOutput: vi.fn(),
  runPythonWithOutput: vi.fn(),
  indexLogics: vi.fn(),
  createEmptyAgentRegistry: vi.fn(),
  loadAgentRegistry: vi.fn(),
  getWorkspaceRoot: vi.fn(),
  hasMultipleWorkspaceFolders: vi.fn(),
  isExistingDirectory: vi.fn(),
  areSamePath: vi.fn(),
  publishCodexWorkspaceOverlay: vi.fn(),
  shouldPublishRepoKit: vi.fn(),
  inspectCodexWorkspaceOverlay: vi.fn(),
  inspectClaudeGlobalKit: vi.fn(),
  detectClaudeBridgeStatus: vi.fn(),
  inspectRuntimeLaunchers: vi.fn(),
  inspectGitHubReleaseCapability: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showQuickPick: mocks.showQuickPick,
    showWarningMessage: mocks.showWarningMessage,
    withProgress: mocks.withProgress,
    createWebviewPanel: mocks.createWebviewPanel,
    createTerminal: mocks.createTerminal
  },
  env: {
    openExternal: mocks.openExternal,
    clipboard: {
      writeText: mocks.clipboardWriteText
    }
  },
  Uri: {
    parse: vi.fn(),
    file: vi.fn((value: string) => ({ fsPath: value }))
  },
  ViewColumn: {
    Beside: 2
  },
  ProgressLocation: {
    Notification: 15
  },
  QuickPickItemKind: {
    Separator: -1
  },
  commands: {
    getCommands: mocks.getCommands,
    executeCommand: mocks.executeCommand
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: vi.fn()
  }
}));

vi.mock("../src/logicsProviderUtils", () => ({
  areSamePath: mocks.areSamePath,
  buildLogicsKitUpdateCommand: mocks.buildLogicsKitUpdateCommand,
  detectDangerousGitignorePatterns: mocks.detectDangerousGitignorePatterns,
  detectKitInstallType: mocks.detectKitInstallType,
  getWorkspaceRoot: mocks.getWorkspaceRoot,
  hasMultipleWorkspaceFolders: mocks.hasMultipleWorkspaceFolders,
  inspectLogicsBootstrapState: mocks.inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule: mocks.inspectLogicsKitSubmodule,
  isExistingDirectory: mocks.isExistingDirectory,
  runGitWithOutput: mocks.runGitWithOutput,
  runPythonWithOutput: mocks.runPythonWithOutput,
  updateIndicatorsOnDisk: vi.fn()
}));

vi.mock("../src/logicsIndexer", () => ({
  canPromote: vi.fn(),
  indexLogics: mocks.indexLogics,
  isRequestProcessed: vi.fn()
}));

vi.mock("../src/agentRegistry", () => ({
  AgentDefinition: class {},
  AgentRegistrySnapshot: class {},
  createEmptyAgentRegistry: mocks.createEmptyAgentRegistry,
  loadAgentRegistry: mocks.loadAgentRegistry
}));

vi.mock("../src/workflowSupport", () => ({
  buildBootstrapCommitMessage: vi.fn(),
  isBootstrapScopedPath: vi.fn(),
  parseGitStatusEntries: vi.fn(() => [])
}));

vi.mock("../src/logicsWebviewHtml", () => ({
  buildLogicsWebviewHtml: vi.fn(() => "<html></html>")
}));

vi.mock("../src/logicsCodexWorkspace", () => ({
  inspectCodexWorkspaceOverlay: mocks.inspectCodexWorkspaceOverlay,
  publishCodexWorkspaceOverlay: mocks.publishCodexWorkspaceOverlay,
  shouldPublishRepoKit: mocks.shouldPublishRepoKit
}));

vi.mock("../src/logicsClaudeGlobalKit", () => ({
  inspectClaudeGlobalKit: mocks.inspectClaudeGlobalKit
}));

vi.mock("../src/runtimeLaunchers", () => ({
  inspectRuntimeLaunchers: mocks.inspectRuntimeLaunchers
}));

vi.mock("../src/releasePublishSupport", () => ({
  inspectGitHubReleaseCapability: mocks.inspectGitHubReleaseCapability
}));

vi.mock("../src/logicsEnvironment", () => ({
  detectClaudeBridgeStatus: mocks.detectClaudeBridgeStatus,
  inspectLogicsEnvironment: vi.fn(async () => ({
    root: "/workspace/mock",
    repositoryState: "partial-bootstrap",
    hasLogicsDir: true,
    hasSkillsDir: true,
    hasFlowManagerScript: true,
    hasBootstrapScript: true,
    missingWorkflowDirs: ["logics/request"],
    git: { available: true },
    python: { available: false, command: null },
    capabilities: {
      readOnly: {
        status: "available",
        summary: "Browsing existing Logics docs remains available even when Git or Python prerequisites are missing."
      },
      workflowMutation: {
        status: "unavailable",
        summary: "Requires Python 3 on PATH for create, promote, and fix actions."
      },
      bootstrapRepair: {
        status: "available",
        summary: "Bootstrap or repair is available from the extension."
      },
      diagnostics: {
        status: "available",
        summary: "Always available from the command palette or Tools menu."
      },
      hybridAssist: {
        status: "available",
        summary: "Hybrid assist runtime ready (codex fallback)."
      },
      codexRuntime: {
        status: "unavailable",
        summary: "Repo-local Logics is ready, but the global Codex kit still needs publication."
      }
    },
    hybridRuntime: {
      state: "degraded",
      summary: "Hybrid assist runtime degraded (codex fallback).",
      backend: "codex",
      requestedBackend: "auto",
      degraded: true,
      degradedReasons: ["ollama-unreachable"],
      claudeBridgeAvailable: true,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    },
    claudeGlobalKit: {
      status: "missing-overlay",
      summary: "No global Claude Logics kit is published yet.",
      issues: ["Global Claude kit manifest is missing."],
      warnings: [],
      sourceRepo: "/workspace/mock",
      publishedSkillNames: [],
      needsPublish: true
    },
    codexOverlay: {
      status: "missing-overlay",
      summary: "No global Codex Logics kit is published yet. Opening this repository can publish it automatically.",
      issues: ["Global Logics kit manifest is missing."],
      warnings: [],
      runCommand: "codex",
      installedVersion: "1.4.0",
      sourceRepo: "/workspace/mock"
    }
  }))
}));

import { detectClaudeBridgeStatus, inspectLogicsEnvironment } from "../src/logicsEnvironment";
import { LogicsViewProvider } from "../src/logicsViewProvider";
import { buildBootstrapCommitMessage, isBootstrapScopedPath, parseGitStatusEntries } from "../src/workflowSupport";

describe("LogicsViewProvider", () => {
  let root: string;
  let provider: LogicsViewProvider;
  const originalClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;


  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-provider-"));
    const globalStateStore = new Map<string, unknown>([
      ["logics.onboardingLastVersion", "1.19.1"]
    ]);
    const workspaceStateStore = new Map<string, unknown>();
    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.showWarningMessage.mockReset();
    mocks.withProgress.mockReset();
    mocks.showQuickPick.mockReset();
    mocks.clipboardWriteText.mockReset();
    mocks.getCommands.mockReset();
    mocks.executeCommand.mockReset();
    mocks.globalStateGet.mockReset();
    mocks.globalStateUpdate.mockReset();
    mocks.buildLogicsKitUpdateCommand.mockReset();
    mocks.inspectLogicsKitSubmodule.mockReset();
    mocks.runGitWithOutput.mockReset();
    mocks.runPythonWithOutput.mockReset();
    mocks.createWebviewPanel.mockReset();
    mocks.inspectLogicsBootstrapState.mockReset();
    mocks.indexLogics.mockReset();
    mocks.createEmptyAgentRegistry.mockReset();
    mocks.loadAgentRegistry.mockReset();
    mocks.getWorkspaceRoot.mockReset();
    mocks.hasMultipleWorkspaceFolders.mockReset();
    mocks.isExistingDirectory.mockReset();
    mocks.areSamePath.mockReset();
    mocks.createTerminal.mockReset();
    mocks.publishCodexWorkspaceOverlay.mockReset();
    mocks.shouldPublishRepoKit.mockReset();
    mocks.inspectCodexWorkspaceOverlay.mockReset();
    mocks.inspectClaudeGlobalKit.mockReset();
    mocks.detectDangerousGitignorePatterns.mockReset();
    mocks.detectKitInstallType.mockReset();
    mocks.detectClaudeBridgeStatus.mockReset();
    mocks.inspectRuntimeLaunchers.mockReset();
    mocks.inspectGitHubReleaseCapability.mockReset();
    vi.mocked(updateIndicatorsOnDisk).mockReset();
    mocks.detectClaudeBridgeStatus.mockReturnValue({
      available: true,
      preferredVariant: "hybrid-assist",
      detectedVariants: ["hybrid-assist"],
      supportedVariants: ["hybrid-assist", "flow-manager"]
    });

    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics in this project",
      promptMessage: "No logics/ folder found. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found in the selected repository."
    });
    mocks.indexLogics.mockReturnValue([]);
    mocks.createEmptyAgentRegistry.mockReturnValue({ agents: [], issues: [] });
    mocks.loadAgentRegistry.mockReturnValue({ agents: [], issues: [] });
    mocks.getWorkspaceRoot.mockReturnValue(root);
    mocks.hasMultipleWorkspaceFolders.mockReturnValue(false);
    mocks.isExistingDirectory.mockReturnValue(true);
    mocks.areSamePath.mockImplementation((left: string, right: string) => left === right);
    mocks.buildLogicsKitUpdateCommand.mockReturnValue("git submodule update --init --remote --merge -- logics/skills");
    mocks.detectDangerousGitignorePatterns.mockReturnValue({
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: "No broad .gitignore pattern covering logics/skills was detected."
    });
    mocks.detectKitInstallType.mockReturnValue("submodule");
    mocks.inspectLogicsKitSubmodule.mockReturnValue({
      exists: true,
      isCanonical: true,
      reason: "Canonical cdx-logics-kit submodule detected."
    });
    mocks.runGitWithOutput.mockResolvedValue({
      stdout: "",
      stderr: ""
    });
    mocks.withProgress.mockImplementation(async (_options, task) => task({ report: vi.fn() }, {} as never));
    mocks.createWebviewPanel.mockReturnValue({
      title: "",
      reveal: vi.fn(),
      onDidDispose: vi.fn(),
      webview: {
        html: "",
        cspSource: "vscode-webview://test",
        onDidReceiveMessage: vi.fn(),
        postMessage: vi.fn()
      }
    } as never);
    mocks.createTerminal.mockReturnValue({
      show: vi.fn(),
      sendText: vi.fn()
    });
    mocks.getCommands.mockResolvedValue([]);
    mocks.shouldPublishRepoKit.mockReturnValue(false);
    mocks.inspectCodexWorkspaceOverlay.mockReturnValue({
      status: "missing-overlay",
      summary: "No global Codex Logics kit is published yet.",
      issues: [],
      warnings: [],
      overlayRoot: path.join(root, ".codex", "skills"),
      codexHome: path.join(root, ".codex"),
      publishedSkillNames: [],
      needsPublish: true
    });
    mocks.inspectClaudeGlobalKit.mockReturnValue({
      status: "missing-overlay",
      summary: "No global Claude Logics kit is published yet.",
      issues: [],
      warnings: [],
      claudeHome: path.join(root, ".claude"),
      publishedSkillNames: [],
      needsPublish: true
    });
    mocks.publishCodexWorkspaceOverlay.mockReturnValue({
      publicationMode: "symlink",
      manifestPath: "/tmp/logics-global-kit.json",
      installedVersion: "1.4.0",
      sourceRevision: "abc123",
      publishedSkillNames: ["demo-skill"]
    });
    mocks.inspectRuntimeLaunchers.mockResolvedValue({
      codex: {
        available: true,
        title: "Launch Codex with the globally published Logics kit",
        command: "codex"
      },
      claude: {
        available: true,
        title: "Launch Claude with the globally published Logics kit",
        command: "claude"
      }
    });
    mocks.inspectGitHubReleaseCapability.mockResolvedValue({
      available: true,
      title: "Create the release tag, push, and publish the GitHub release"
    });
    mocks.globalStateGet.mockImplementation((key: string) => globalStateStore.get(key));
    mocks.globalStateUpdate.mockImplementation(async (key: string, value: unknown) => {
      if (typeof value === "undefined") {
        globalStateStore.delete(key);
      } else {
        globalStateStore.set(key, value);
      }
    });
    mocks.workspaceStateGet.mockImplementation((key: string) => workspaceStateStore.get(key));
    mocks.workspaceStateUpdate.mockImplementation(async (key: string, value: unknown) => {
      if (typeof value === "undefined") {
        workspaceStateStore.delete(key);
      } else {
        workspaceStateStore.set(key, value);
      }
    });
    vi.mocked(inspectLogicsEnvironment).mockReset();
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue(defaultEnvironmentSnapshot(root) as never);

    provider = new LogicsViewProvider(
      {
        extensionUri: {},
        extensionPath: root,
        extension: { packageJSON: { version: "1.19.1" } },
        globalState: {
          get: mocks.globalStateGet,
          update: mocks.globalStateUpdate
        },
        workspaceState: {
          get: mocks.workspaceStateGet,
          update: mocks.workspaceStateUpdate
        }
      } as never,
      vi.fn(),
      { appendLine: vi.fn(), show: vi.fn(), clear: vi.fn() } as never
    );
  });

  afterEach(() => {
    if (typeof originalClaudeHome === "string") {
      process.env.LOGICS_CLAUDE_GLOBAL_HOME = originalClaudeHome;
    } else {
      delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("uses a repair-oriented bootstrap prompt when logics exists but skills are missing", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "incomplete",
      canBootstrap: true,
      actionTitle: "Bootstrap or repair Logics in this project",
      promptMessage: "Logics bootstrap is incomplete. Bootstrap or repair Logics by adding the cdx-logics-kit submodule?",
      reason: "The repository has logics/ but logics/skills is still missing."
    });
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await (provider as any).maybeOfferBootstrap(root);

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics bootstrap is incomplete. Bootstrap or repair Logics by adding the cdx-logics-kit submodule?",
      "Bootstrap Logics",
      "Not now"
    );
  });

  it("warns once at startup when a broad gitignore pattern hides logics/skills", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "incomplete",
      canBootstrap: true,
      actionTitle: "Repair Logics setup on this branch",
      promptMessage: "This branch has an incomplete Logics setup (logics/skills is missing). Repair by adding the cdx-logics-kit submodule?",
      reason: "The active branch has logics/ but logics/skills is still missing."
    });
    mocks.detectDangerousGitignorePatterns.mockReturnValueOnce({
      hasDangerousPatterns: true,
      matchedPatterns: ["logics/"],
      reason: "Broad .gitignore pattern(s) cover logics/skills: logics/."
    });
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await (provider as any).maybeOfferBootstrap(root);

    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      "Broad .gitignore pattern(s) detected for logics/skills: logics/. This can break the submodule update path, but the extension can fall back to a copy or direct clone if you confirm."
    );
  });

  it("opens onboarding on first refresh for a new project even when the extension version was seen elsewhere", async () => {
    const onDidDispose = vi.fn();
    const onDidReceiveMessage = vi.fn();
    const panel = {
      title: "",
      reveal: vi.fn(),
      onDidDispose,
      webview: {
        html: "",
        cspSource: "vscode-webview://test",
        onDidReceiveMessage,
        postMessage: vi.fn()
      }
    };
    mocks.createWebviewPanel.mockReturnValue(panel as never);
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await provider.refresh();

    expect(mocks.createWebviewPanel).toHaveBeenCalledWith(
      "logics.onboarding",
      "Logics: Getting Started",
      2,
      expect.objectContaining({
        enableScripts: true,
        retainContextWhenHidden: false
      })
    );
  });

  it("changes item status with stage-aware quick-pick options and refreshes the item", async () => {
    const item = {
      id: "item_001_ready",
      title: "Ready backlog item",
      stage: "backlog",
      path: path.join(root, "logics", "backlog", "item_001_ready.md"),
      indicators: {
        Status: "Ready"
      }
    };
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(updateIndicatorsOnDisk).mockReturnValue(true);
    mocks.showQuickPick.mockResolvedValue({ label: "Blocked" });

    await viewProviderSupport.changeItemStatus.call(
      {
        items: [item],
        getValidStatusesForItem: viewProviderSupport.getValidStatusesForItem,
        refresh
      },
      item.id
    );

    expect(mocks.showQuickPick).toHaveBeenCalledWith(
      [
        { label: "Draft", description: undefined, picked: false },
        { label: "Ready", description: "Current status", picked: true },
        { label: "In progress", description: undefined, picked: false },
        { label: "Blocked", description: undefined, picked: false },
        { label: "Done", description: undefined, picked: false },
        { label: "Archived", description: undefined, picked: false }
      ],
      expect.objectContaining({
        placeHolder: "Change status for item_001_ready",
        title: "Ready backlog item"
      })
    );
    expect(updateIndicatorsOnDisk).toHaveBeenCalledWith(item.path, { Status: "Blocked" });
    expect(refresh).toHaveBeenCalledWith(item.id);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith("Updated item_001_ready status to Blocked.");
  });

  it("does not reopen onboarding on later refreshes for the same project and version", async () => {
    const onDidDispose = vi.fn();
    const onDidReceiveMessage = vi.fn();
    const panel = {
      title: "",
      reveal: vi.fn(),
      onDidDispose,
      webview: {
        html: "",
        cspSource: "vscode-webview://test",
        onDidReceiveMessage,
        postMessage: vi.fn()
      }
    };
    mocks.createWebviewPanel.mockReturnValue(panel as never);
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await provider.refresh();
    await provider.refresh();

    expect(mocks.createWebviewPanel).toHaveBeenCalledTimes(1);
  });

  it("executes onboarding footer shortcuts directly", async () => {
    const onDidDispose = vi.fn();
    let didReceiveMessage: ((message: { type: string; action?: string }) => Promise<void> | void) | undefined;
    const panel = {
      title: "",
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose,
      webview: {
        html: "",
        cspSource: "vscode-webview://test",
        onDidReceiveMessage: vi.fn((callback) => {
          didReceiveMessage = callback;
        }),
        postMessage: vi.fn()
      }
    };
    mocks.createWebviewPanel.mockReturnValue(panel as never);
    mocks.showInformationMessage.mockResolvedValue("Not now");
    const openLogicsInsightsFromTools = vi.fn().mockResolvedValue(undefined);
    (provider as any).openLogicsInsightsFromTools = openLogicsInsightsFromTools;

    await provider.refresh();
    await didReceiveMessage?.({ type: "tool-action", action: "open-logics-insights" });

    expect(panel.dispose).toHaveBeenCalledTimes(1);
    expect(openLogicsInsightsFromTools).toHaveBeenCalledTimes(1);
    expect(mocks.openExternal).not.toHaveBeenCalled();

    await didReceiveMessage?.({ type: "tool-action", action: "about" });

    expect(panel.dispose).toHaveBeenCalledTimes(2);
    expect(mocks.openExternal).toHaveBeenCalledTimes(1);
  });

  it("keeps rendering items when non-critical refresh diagnostics reject", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    const postMessage = vi.fn();
    (provider as any).view = {
      webview: {
        postMessage
      }
    };
    mocks.indexLogics.mockReturnValue([
      {
        id: "req_132_windows_fix",
        title: "Windows fix",
        stage: "request",
        path: path.join(root, "logics", "request", "req_132_windows_fix.md"),
        relPath: "logics/request/req_132_windows_fix.md",
        indicators: {},
        references: [],
        usedBy: []
      }
    ]);
    mocks.inspectRuntimeLaunchers.mockRejectedValueOnce(new Error("launchers unavailable"));
    mocks.inspectGitHubReleaseCapability.mockRejectedValueOnce(new Error("release capability unavailable"));

    await provider.refresh();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "data",
        payload: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "req_132_windows_fix"
            })
          ]),
          changedPaths: [],
          canLaunchCodex: false,
          canLaunchClaude: false,
          canPublishRelease: false,
          shouldRecommendCheckEnvironment: true
        })
      })
    );
  });

  it("surfaces an explicit board error when indexLogics throws", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    const postMessage = vi.fn();
    (provider as any).view = {
      webview: {
        postMessage
      }
    };
    mocks.indexLogics.mockImplementation(() => {
      throw new Error("simulated indexing failure");
    });

    await provider.refresh();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "data",
        payload: expect.objectContaining({
          error: expect.stringContaining("simulated indexing failure"),
          canLaunchCodex: false,
          canLaunchClaude: false,
          canPublishRelease: false,
          shouldRecommendCheckEnvironment: true
        })
      })
    );
  });

  it("surfaces non-canonical bootstrap state instead of claiming bootstrap is complete", async () => {
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "noncanonical",
      canBootstrap: false,
      actionTitle: "Bootstrap unavailable until the current logics/skills setup is repaired",
      reason: "The repository does not declare logics/skills in .gitmodules."
    });

    await (provider as any).bootstrapFromTools();

    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      "Bootstrap Logics is unavailable until the current logics/skills setup is repaired. The repository does not declare logics/skills in .gitmodules."
    );
  });

  it("runs bootstrap from Tools when the canonical kit still needs repo-local convergence", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: true,
      actionTitle: "Reconcile Logics bootstrap on this branch",
      promptMessage: "Canonical kit needs repo-local convergence.",
      reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
      missingPaths: ["logics.yaml"],
      convergenceNeeded: true
    });
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      root,
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "available", summary: "Global kit ready." }
      },
      codexOverlay: {
        status: "healthy",
        summary: "Global kit ready.",
        issues: [],
        warnings: [],
        runCommand: "codex"
      }
    } as never);
    mocks.runGitWithOutput.mockImplementation(async (_cwd: string, args: string[]) => {
      if (args[0] === "status" && args[1] === "--porcelain") {
        return { stdout: "", stderr: "" };
      }
      if (args[0] === "rev-parse") {
        return { stdout: "true\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });

    await (provider as any).bootstrapFromTools();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(root, "logics", "skills", "logics.py"),
      ["bootstrap"]
    );
    expect(mocks.showInformationMessage).not.toHaveBeenCalledWith("Logics bootstrap already configured.");
  });

  it("shows an actionable error when bootstrap is requested without git on PATH", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      root,
      repositoryState: "partial-bootstrap",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: false },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "unavailable", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "unavailable", summary: "Global kit pending publication." }
      },
      codexOverlay: {
        status: "missing-overlay",
        summary: "Global kit pending publication.",
        issues: ["Global Logics kit manifest is missing."],
        warnings: [],
        runCommand: "codex"
      }
    } as never);
    mocks.runGitWithOutput.mockResolvedValue({
      stdout: "",
      stderr: "'git' is not recognized as an internal or external command",
      error: new Error("spawn git ENOENT")
    });

    await (provider as any).bootstrapLogics(root);

    expect(mocks.showErrorMessage).toHaveBeenCalledWith(
      "Bootstrap Logics requires Git. Git not found. Install Git and ensure `git` is available on PATH or configure VS Code `git.path`, then retry. The extension can repair repository state but cannot install system tools automatically. Use `Logics: Check Environment` for details. Read-only Logics browsing remains available until bootstrap completes."
    );
    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
  });

  it("adds the canonical kit submodule on first bootstrap before running logics.py", async () => {
    mocks.inspectLogicsKitSubmodule.mockReturnValue({
      exists: false,
      isCanonical: false,
      reason: "logics/skills is missing from the selected repository."
    });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: "This branch does not have Logics set up yet. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found on the active branch."
    });
    mocks.showInformationMessage.mockImplementation(async (message: string) => {
      if (message.includes("Run `git init`")) {
        return "Initialize Git";
      }
      return undefined;
    });
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      root,
      repositoryState: "missing-logics",
      hasLogicsDir: false,
      hasSkillsDir: false,
      hasFlowManagerScript: false,
      hasBootstrapScript: false,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "unavailable", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "unavailable", summary: "Global kit pending publication." }
      },
      codexOverlay: {
        status: "missing-overlay",
        summary: "Global kit pending publication.",
        issues: ["Global Logics kit manifest is missing."],
        warnings: [],
        runCommand: "codex"
      }
    } as never);
    mocks.runGitWithOutput.mockImplementation(async (_cwd: string, args: string[]) => {
      if (args[0] === "status" && args[1] === "--porcelain") {
        return { stdout: "", stderr: "" };
      }
      if (args[0] === "rev-parse") {
        return { stdout: "", stderr: "fatal: not a git repository (or any of the parent directories): .git", error: new Error("not a git repository") };
      }
      if (args[0] === "init") {
        return { stdout: "Initialized empty Git repository\n", stderr: "" };
      }
      if (args[0] === "submodule" && args[1] === "add") {
        fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
        fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
        return { stdout: "", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });
    mocks.shouldPublishRepoKit.mockReturnValue(false);
    (provider as any).refresh = vi.fn().mockResolvedValue(undefined);

    await (provider as any).bootstrapLogics(root);

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Bootstrap Logics requires a Git repository. This folder is not initialized yet. Run `git init` and continue bootstrap?",
      "Initialize Git",
      "Not now"
    );
    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, ["init"]);
    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(
      root,
      ["submodule", "add", "-b", "main", "https://github.com/AlexAgo83/cdx-logics-kit.git", "logics/skills"]
    );
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(root, "logics", "skills", "logics.py"),
      ["bootstrap"]
    );
  });

  it("auto-publishes the global kit during bootstrap before reporting full completion", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics.py"),
      "#!/usr/bin/env python\n",
      "utf8"
    );
    mocks.runGitWithOutput.mockImplementation(async (_cwd: string, args: string[]) => {
      if (args[0] === "--version") {
        return { stdout: "git version 2.0.0\n", stderr: "" };
      }
      if (args[0] === "rev-parse") {
        return { stdout: "true\n", stderr: "" };
      }
      if (args[0] === "status" && args[1] === "--porcelain") {
        return { stdout: "", stderr: "" };
      }
      if (args[0] === "submodule" && args[1] === "add") {
        return { stdout: "", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });
    mocks.shouldPublishRepoKit.mockReturnValueOnce(true).mockReturnValue(false);
    (provider as any).refresh = vi.fn().mockResolvedValue(undefined);

    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment)
      .mockResolvedValueOnce({
      root,
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "unavailable", summary: "Global kit pending publication." }
      },
      codexOverlay: {
        status: "missing-overlay",
        summary: "Global kit pending publication.",
        issues: ["Global Logics kit manifest is missing."],
        warnings: [],
        runCommand: "codex"
      }
    } as never)
      .mockResolvedValueOnce({
      root,
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "unavailable", summary: "Global kit pending publication." }
      },
      codexOverlay: {
        status: "missing-overlay",
        summary: "Global kit pending publication.",
        issues: ["Global Logics kit manifest is missing."],
        warnings: [],
        runCommand: "codex"
      }
    } as never)
      .mockResolvedValueOnce({
      root,
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "available", summary: "Global kit ready." }
      },
      codexOverlay: {
        status: "healthy",
        summary: "Global kit ready.",
        issues: [],
        warnings: [],
        runCommand: "codex"
      }
    } as never)
      .mockResolvedValueOnce({
      root,
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
        codexRuntime: { status: "available", summary: "Global kit ready." }
      },
      codexOverlay: {
        status: "healthy",
        summary: "Global kit ready.",
        issues: [],
        warnings: [],
        runCommand: "codex"
      }
    } as never);

    await (provider as any).bootstrapLogics(root);

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics bootstrapped. Repo-local kit and the global Codex kit are ready. Global Codex kit publication completed during bootstrap. Refreshing."
    );
  });
});
