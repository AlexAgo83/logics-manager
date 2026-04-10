import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultEnvironmentSnapshot } from "./logicsViewProviderTestUtils";

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
      hasCodex: true,
      hasClaude: true,
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

  it("re-publishes the global Codex kit when the current repo is newer than a warning-state publication", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
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
          codexRuntime: { status: "available", summary: "Global kit older than repo-local source." }
        },
        codexOverlay: {
          status: "warning",
          summary: "Global Codex Logics kit is usable, but a newer or different repo-local source is available.",
          issues: [],
          warnings: ["Repo-local kit version 1.9.1 is newer than the published global version 1.9.0."],
          runCommand: "codex",
          installedVersion: "1.9.0",
          sourceRepo: "/Users/alexandreagostini/Documents/emberwake"
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
          runCommand: "codex",
          installedVersion: "1.9.1",
          sourceRepo: root
        }
      } as never)
      .mockResolvedValue({
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
          runCommand: "codex",
          installedVersion: "1.9.1",
          sourceRepo: root
        }
      } as never);

    await (provider as any).codexWorkflowController.ensureGlobalCodexKit(root);

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
  });

  it("skips startup auto-publish and remediation while bootstrap is already running", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    const controller = (provider as any).codexWorkflowController;
    controller.bootstrapInProgressRoots.add(path.resolve(root));
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

    await provider.refresh();

    expect(mocks.publishCodexWorkspaceOverlay).not.toHaveBeenCalled();
    controller.bootstrapInProgressRoots.delete(path.resolve(root));
  });

  it("stops the startup convergence pass after triggering bootstrap from refresh", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
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

    const controller = (provider as any).codexWorkflowController;
    vi.spyOn(controller, "maybeOfferBootstrap").mockResolvedValue(true);

    await provider.refresh();

    expect(mocks.publishCodexWorkspaceOverlay).not.toHaveBeenCalled();
  });

  it("offers a direct bootstrap commit when the bootstrap change set is isolated", async () => {
    mocks.runGitWithOutput
      .mockResolvedValueOnce({
        stdout: "A  .gitmodules\nA  logics/skills\n?? logics/request/req_001_demo.md\n",
        stderr: ""
      })
      .mockResolvedValueOnce({
        stdout: "",
        stderr: ""
      })
      .mockResolvedValueOnce({
        stdout: "[main 1234567] Bootstrap Logics kit and initialize workflow docs\n",
        stderr: ""
      });
    vi.mocked(parseGitStatusEntries).mockReturnValue([
      { indexStatus: "A", workTreeStatus: " ", path: ".gitmodules" },
      { indexStatus: "A", workTreeStatus: " ", path: "logics/skills" },
      { indexStatus: "?", workTreeStatus: "?", path: "logics/request/req_001_demo.md" }
    ]);
    vi.mocked(isBootstrapScopedPath).mockImplementation((filePath: string) => filePath === ".gitmodules" || filePath.startsWith("logics/"));
    vi.mocked(buildBootstrapCommitMessage).mockReturnValue("Bootstrap Logics kit and initialize workflow docs");
    mocks.showInformationMessage.mockResolvedValueOnce("Commit Bootstrap Changes").mockResolvedValueOnce(undefined);

    const controller = (provider as any).codexWorkflowController;
    await controller.maybeOfferBootstrapCommit(root, []);

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Bootstrap updated Logics files in this repository. Commit the bootstrap changes now with message: Bootstrap Logics kit and initialize workflow docs",
      "Commit Bootstrap Changes",
      "Copy Commit Message"
    );
    expect(mocks.runGitWithOutput).toHaveBeenNthCalledWith(2, root, [
      "add",
      "-A",
      "--",
      ".gitmodules",
      "logics/skills",
      "logics/request/req_001_demo.md"
    ]);
    expect(mocks.runGitWithOutput).toHaveBeenNthCalledWith(3, root, [
      "commit",
      "-m",
      "Bootstrap Logics kit and initialize workflow docs",
      "--only",
      "--",
      ".gitmodules",
      "logics/skills",
      "logics/request/req_001_demo.md"
    ]);
  });

  it("falls back to copying the bootstrap commit message when bootstrap-scoped changes already existed", async () => {
    mocks.runGitWithOutput.mockResolvedValueOnce({
      stdout: "M  logics/request/req_001_demo.md\n",
      stderr: ""
    });
    vi.mocked(parseGitStatusEntries).mockReturnValue([
      { indexStatus: "M", workTreeStatus: " ", path: "logics/request/req_001_demo.md" }
    ]);
    vi.mocked(isBootstrapScopedPath).mockImplementation((filePath: string) => filePath.startsWith("logics/"));
    vi.mocked(buildBootstrapCommitMessage).mockReturnValue("Initialize Logics workflow docs");
    mocks.showInformationMessage.mockResolvedValueOnce("Copy Commit Message").mockResolvedValueOnce(undefined);

    const controller = (provider as any).codexWorkflowController;
    await controller.maybeOfferBootstrapCommit(root, ["logics/request/req_001_demo.md"]);

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Bootstrap updated Logics files in this repository. Suggested commit message: Initialize Logics workflow docs",
      "Copy Commit Message"
    );
    expect(mocks.clipboardWriteText).toHaveBeenCalledWith("Initialize Logics workflow docs");
  });

  it("reports a partial bootstrap outcome when automatic global publication fails", async () => {
    mocks.showInformationMessage.mockResolvedValue(undefined);
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
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
        codexRuntime: { status: "unavailable", summary: "Global kit needs repair." }
      },
      codexOverlay: {
        status: "stale",
        summary: "Global Codex Logics kit needs repair or re-publication before it is reliable.",
        issues: ["Manifest unreadable."],
        warnings: [],
        runCommand: "codex"
      }
    } as never);

    await (provider as any).notifyBootstrapCompletion(root, {
      attempted: true,
      published: false,
      failed: true,
      failureMessage: "permission denied"
    });

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics bootstrapped partially. Repo-local kit is ready, but the global Codex kit is not ready yet. Global Codex Logics kit needs repair or re-publication before it is reliable. Automatic publication failed during bootstrap: permission denied.",
      "Publish Global Codex Kit"
    );
  });

  it("selects an agent, copies its prompt, and does not trigger Codex handoff", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    const handoffSpy = vi.spyOn(provider as any, "maybeShowCodexOverlayHandoff");
    const injectSpy = vi.spyOn(provider as any, "injectAgentPromptIntoCodexChat");
    const agent = {
      id: "$demo-agent",
      displayName: "Demo Agent",
      shortDescription: "Does demo work",
      defaultPrompt: "demo prompt",
      preferredContextProfile: "normal",
      allowedDocStages: ["request", "backlog", "task"],
      blockedDocStages: [],
      responseStyle: "balanced"
    };
    mocks.loadAgentRegistry.mockReturnValue({
      agents: [agent],
      issues: [],
      scannedFiles: 1
    });
    mocks.showQuickPick.mockResolvedValue({
      label: agent.displayName,
      description: agent.shortDescription,
      detail: agent.id,
      agent
    });

    await provider.selectAgentFromPalette();

    expect(injectSpy).toHaveBeenCalledWith(agent);
    expect(handoffSpy).not.toHaveBeenCalled();
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(`Active Logics agent: ${agent.displayName} (${agent.id})`);
  });

  it("surfaces the environment capability snapshot through the diagnostic quick pick", async () => {
    await provider.checkEnvironmentFromCommand();

    expect(mocks.showQuickPick).toHaveBeenCalledTimes(1);
    const [items, options] = mocks.showQuickPick.mock.calls[0];
    expect(options.title).toBe("Logics: Check Environment");
    expect(items.some((item: { label: string }) => item.label.includes("Environment: Blocked"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Workflow editing: Blocked"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Workflow folders: Incomplete but recoverable"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Global Codex kit: Needs attention"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Global Claude kit: Needs attention"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("AI assistant runtime: Degraded"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Codex launch command"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Open detailed diagnostic report"))).toBe(true);
  });

  it("surfaces a gitignore warning in Check Environment when broad logics patterns are present", async () => {
    mocks.detectDangerousGitignorePatterns.mockReturnValueOnce({
      hasDangerousPatterns: true,
      matchedPatterns: ["logics/"],
      reason: "Broad .gitignore pattern(s) cover logics/skills: logics/."
    });

    await provider.checkEnvironmentFromCommand();

    const items = mocks.showQuickPick.mock.calls[0][0] as Array<{ label: string }>;
    expect(items.some((item) => item.label.includes("Gitignore warning"))).toBe(true);
  });

  it("can surface hybrid runtime status through the shared assist command", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        degraded: true,
        degraded_reasons: ["ollama-unreachable"],
        providers: {
          ollama: {
            enabled: true,
            healthy: false,
            reasons: ["ollama-unreachable"]
          },
          openai: {
            enabled: true,
            healthy: true
          },
          gemini: {
            enabled: true,
            healthy: false,
            reasons: ["missing-credentials"]
          }
        },
        backend: {
          selected_backend: "codex"
        }
      }),
      stderr: ""
    });

    await (provider as any).checkHybridRuntimeFromTools();

    expect(mocks.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Check Hybrid Runtime: waiting on hybrid assist backend..."
      }),
      expect.any(Function)
    );
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, path.join(root, "logics", "skills", "logics.py"), [
      "flow",
      "assist",
      "runtime-status",
      "--format",
      "json"
    ]);
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      "Check Hybrid Runtime completed via codex. Runtime is degraded. Ready providers: openai. Attention: ollama (ollama-unreachable) | gemini (missing-credentials). Degraded reasons: ollama-unreachable."
    );
  });

});
