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

  it("offers a startup notification to update the kit when overlays are unsupported by the current submodule", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
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
        codexRuntime: { status: "unavailable", summary: "Manager missing." }
      },
      codexOverlay: {
        status: "missing-manager",
        summary: "This repository does not expose a compatible repo-local Logics kit source for global publication.",
        issues: ["No compatible repo-local Logics kit source is available for global publication."],
        warnings: [],
        runCommand: "codex"
      }
    } as never);
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.refresh();
    await provider.refresh();

    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "This repository already has Logics, but it cannot act as a healthy global Codex kit source yet. This repository does not expose a compatible repo-local Logics kit source for global publication.",
      "Update Logics Kit",
      "Copy Update Command",
      "Not now"
    );
  });

  it("prompts for bootstrap once per distinct bootstrap state, not once per root", async () => {
    // First call: root is in 'missing' state → prompt shown
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: "This branch does not have Logics set up yet. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found on the active branch."
    });
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);

    // Second call: same root, same state → suppressed (already prompted for this state)
    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);

    // Third call: same root but different state (branch switch) → prompt fires again
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "incomplete",
      canBootstrap: true,
      actionTitle: "Repair Logics setup on this branch",
      promptMessage: "This branch has an incomplete Logics setup (logics/skills is missing). Repair by adding the cdx-logics-kit submodule?",
      reason: "The active branch has logics/ but logics/skills is still missing."
    });

    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(2);
    expect(mocks.showInformationMessage).toHaveBeenLastCalledWith(
      "This branch has an incomplete Logics setup (logics/skills is missing). Repair by adding the cdx-logics-kit submodule?",
      "Bootstrap Logics",
      "Not now"
    );
  });

  it("does not re-prompt when branch switches back to a previously-seen bootstrap state", async () => {
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: "This branch does not have Logics set up yet. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found on the active branch."
    });
    mocks.showInformationMessage.mockResolvedValue("Not now");

    // First visit to a branch without logics/: prompt fires
    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);

    // Switch to a healthy branch (canonical): no prompt
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);

    // Switch back to branch without logics/: same 'missing' state was already dismissed → suppressed
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics on this branch",
      promptMessage: "This branch does not have Logics set up yet. Bootstrap Logics by adding the cdx-logics-kit submodule?",
      reason: "No logics/ folder found on the active branch."
    });
    await (provider as any).maybeOfferBootstrap(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
  });

  it("routes noncanonical state to a warning instead of a bootstrap prompt", async () => {
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "noncanonical",
      canBootstrap: false,
      actionTitle: "Bootstrap unavailable until the current logics/skills setup is repaired",
      reason: "logics/skills points to a non-canonical submodule URL: https://example.com/fork.git"
    });

    await (provider as any).maybeOfferBootstrap(root);

    expect(mocks.showWarningMessage).toHaveBeenCalledOnce();
    expect(mocks.showInformationMessage).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("non-canonical or malformed")
    );
  });

  it("offers a startup notification to publish the global kit only once per unresolved state", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
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
          codexRuntime: { status: "unavailable", summary: "Global kit missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "No global Codex Logics kit is published yet. Opening this repository can publish it automatically.",
          issues: ["Global Logics kit manifest is missing."],
          warnings: [],
          runCommand: "codex"
        }
      } as never);
    await provider.refresh();
    await provider.refresh();

    expect(mocks.showWarningMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      "Global Codex kit still needs attention. No global Codex Logics kit is published yet. Opening this repository can publish it automatically."
    );
  });

  it("proactively offers Logics kit update on refresh when the canonical repo kit is below the minimum version", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.5.0\n", "utf8");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await provider.refresh();
    await provider.refresh();

    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Older Logics kit detected in this repository (v1.5.0). Update now to restore migration, repair, and environment convergence support.",
      "Update Logics Kit",
      "Check Environment",
      "Not now"
    );
  });

  it("runs Update Logics Kit directly from the startup remediation prompt", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.5.0\n", "utf8");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
    mocks.showInformationMessage.mockResolvedValue("Update Logics Kit");
    const updateSpy = vi.spyOn((provider as any).codexWorkflowController, "updateLogicsKit").mockResolvedValue(true);

    await provider.refresh();

    expect(updateSpy).toHaveBeenCalledWith(root, "startup kit remediation");
  });

});
