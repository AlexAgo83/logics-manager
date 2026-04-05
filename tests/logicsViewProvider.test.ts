import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  publishCodexWorkspaceOverlay: mocks.publishCodexWorkspaceOverlay,
  shouldPublishRepoKit: mocks.shouldPublishRepoKit
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

  function defaultEnvironmentSnapshot(currentRoot: string) {
    return {
      root: currentRoot,
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
        sourceRepo: currentRoot,
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
        sourceRepo: currentRoot
      }
    };
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-provider-"));
    const globalStateStore = new Map<string, unknown>([
      ["logics.onboardingLastVersion", "1.19.1"]
    ]);
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
    mocks.createTerminal.mockReturnValue({
      show: vi.fn(),
      sendText: vi.fn()
    });
    mocks.getCommands.mockResolvedValue([]);
    mocks.shouldPublishRepoKit.mockReturnValue(false);
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
    mocks.shouldPublishRepoKit.mockReturnValue(true);
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

  it("selects an agent without injecting a prompt or triggering Codex handoff", async () => {
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

    expect(injectSpy).not.toHaveBeenCalled();
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

  it("shows an action-specific error when a hybrid assist command returns invalid JSON", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: "not-json",
      stderr: ""
    });

    await (provider as any).summarizeValidationFromTools();

    expect(mocks.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Summarize Validation: waiting on hybrid assist backend..."
      }),
      expect.any(Function)
    );
    expect(mocks.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Summarize Validation returned invalid JSON:")
    );
  });

  it("can generate a changelog summary from the shared runtime and copy it to the clipboard", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.showInformationMessage.mockResolvedValueOnce("Copy Changelog").mockResolvedValueOnce(undefined);
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        backend_used: "ollama",
        backend_requested: "auto",
        result_status: "ok",
        degraded_reasons: [],
        result: {
          title: "Release 1.20.1",
          entries: [
            "Fix Hybrid Insights date ordering.",
            "Improve recent timestamp readability.",
            "Expose changelog summary in Assist."
          ]
        }
      }),
      stderr: ""
    });

    await (provider as any).summarizeChangelogFromTools();

    expect(mocks.withProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Generate Changelog Summary: waiting on hybrid assist backend..."
      }),
      expect.any(Function)
    );
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, path.join(root, "logics", "skills", "logics.py"), [
      "flow",
      "assist",
      "summarize-changelog",
      "--format",
      "json"
    ]);
    expect(mocks.showInformationMessage).toHaveBeenNthCalledWith(
      1,
      "Generate Changelog Summary completed via ollama. Release 1.20.1: Fix Hybrid Insights date ordering. | Improve recent timestamp readability. | Expose changelog summary in Assist.",
      "Copy Changelog"
    );
    expect(mocks.clipboardWriteText).toHaveBeenCalledWith(
      ["Release 1.20.1", "", "- Fix Hybrid Insights date ordering.", "- Improve recent timestamp readability.", "- Expose changelog summary in Assist."].join("\n")
    );
    expect(mocks.showInformationMessage).toHaveBeenNthCalledWith(2, "Changelog summary copied to clipboard.");
  });

  it("can surface the shared diff-risk flow from tools", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        backend_used: "ollama",
        backend_requested: "auto",
        result_status: "ok",
        degraded_reasons: [],
        result: {
          risk: "medium",
          summary: "Runtime and plugin surfaces both changed in this diff.",
          drivers: ["Diff spans shared runtime and extension files."]
        }
      }),
      stderr: ""
    });

    await (provider as any).assessDiffRiskFromTools();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, path.join(root, "logics", "skills", "logics.py"), [
      "flow",
      "assist",
      "diff-risk",
      "--format",
      "json"
    ]);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Assess Diff Risk completed via ollama. Risk: medium. Runtime and plugin surfaces both changed in this diff. Drivers: Diff spans shared runtime and extension files."
    );
  });

  it("copies prompts to the clipboard without using VS Code chat commands", async () => {
    mocks.getCommands.mockResolvedValue([
      "chatgpt.openSidebar",
      "chatgpt.newChat",
      "workbench.action.chat.open",
      "workbench.action.chat.focusInput"
    ]);

    await (provider as any).injectPromptIntoCodexChat("Draft this request");

    expect(mocks.clipboardWriteText).toHaveBeenCalledWith("Draft this request");
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });

  it("copies prompts for a fresh Codex thread without opening Codex automatically", async () => {
    mocks.getCommands.mockResolvedValue(["chatgpt.openSidebar", "chatgpt.newChat"]);

    await (provider as any).injectPromptIntoCodexChat("Draft this request", {
      preferNewThread: true
    });

    expect(mocks.clipboardWriteText).toHaveBeenCalledWith("Draft this request");
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Prompt copied to clipboard. Open a new assistant session, then paste it."
    );
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });

  it("opens the hybrid insights panel from the shared roi-report runtime command", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    const onDidDispose = vi.fn();
    const onDidReceiveMessage = vi.fn();
    const reveal = vi.fn();
    const panel = {
      title: "",
      reveal,
      onDidDispose,
      webview: {
        html: "",
        cspSource: "vscode-webview://test",
        onDidReceiveMessage,
        postMessage: vi.fn()
      }
    };
    mocks.createWebviewPanel.mockReturnValue(panel as never);
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        report_kind: "hybrid-assist-roi-report",
        generated_at: "2026-03-25T09:00:00+00:00",
        sources: {
          audit_log: "logics/hybrid_assist_audit.jsonl",
          measurement_log: "logics/hybrid_assist_measurements.jsonl"
        },
        limits: {
          recent_limit: 8,
          window_days: 14
        },
        measured: {
          totals: {
            runs: 3,
            fallback_runs: 1,
            degraded_runs: 1,
            review_recommended_runs: 1,
            local_runs: 2
          },
          runs_by_flow: {
            "next-step": 1
          },
          backend_requested: {
            auto: 2
          },
          backend_used: {
            codex: 1,
            ollama: 2
          },
          recent_result_distribution: {
            degraded: 1,
            ok: 2
          },
          flow_breakdown: {}
        },
        derived: {
          rates: {
            fallback_rate: 0.3333,
            degraded_rate: 0.3333,
            review_recommended_rate: 0.3333,
            local_offload_rate: 0.6667
          },
          dispatch_split: [],
          top_degraded_reasons: [],
          top_fallback_reasons: [],
          health_summary: ["Runtime looks healthy enough for review."]
        },
        estimated: {
          assumptions: {
            remote_tokens_per_local_run: 1200,
            token_avoidance_note: "Illustrative only.",
            interpretation_note: "Not billing truth."
          },
          proxies: {
            estimated_remote_dispatches_avoided: 2,
            estimated_remote_token_avoidance: 2400,
            estimated_local_offload_share: 0.6667
          }
        },
        recent_runs: []
      }),
      stderr: ""
    });

    await provider.openHybridInsightsFromCommand();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, path.join(root, "logics", "skills", "logics.py"), [
      "flow",
      "assist",
      "roi-report",
      "--format",
      "json"
    ]);
    expect(mocks.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(reveal).toHaveBeenCalled();
    expect(panel.title).toBe(`Hybrid Insights: ${path.basename(root)}`);
    expect(panel.webview.html).toContain("Hybrid Assist Insights");
    expect(panel.webview.html).toContain("Estimated ROI Proxies");
  });

  it("can publish the global kit directly from environment diagnostics", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
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
          codexRuntime: { status: "unavailable", summary: "Global kit missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global kit missing.",
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
          codexRuntime: { status: "unavailable", summary: "Global kit missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global kit missing.",
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
    mocks.showQuickPick.mockImplementationOnce(async (items) =>
      items.find((item: { label: string }) => item.label === "Fix now: Publish Global Codex Kit")
    );
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.checkEnvironmentFromCommand();

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Global Codex kit published after environment diagnostics. Global kit ready.",
      "Launch Codex in Terminal",
      "Copy Codex Launch Command"
    );
  });

  it("launches Codex immediately from Tools when the overlay is already healthy", async () => {
    const show = vi.fn();
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show, sendText });

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

    await (provider as any).launchCodexFromTools();

    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: `Codex: ${path.basename(root)}`,
      cwd: root
    });
    expect(show).toHaveBeenCalledWith(true);
    expect(sendText).toHaveBeenCalledWith("codex", true);
  });

  it("launches Claude immediately from Tools when the CLI and bridge are available", async () => {
    const show = vi.fn();
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show, sendText });
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      ...defaultEnvironmentSnapshot(root),
      repositoryState: "ready",
      missingWorkflowDirs: [],
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      claudeGlobalKit: {
        status: "healthy",
        summary: "Global Claude kit ready.",
        issues: [],
        warnings: [],
        sourceRepo: root,
        publishedSkillNames: ["logics-flow-manager"]
      },
      codexOverlay: {
        status: "healthy",
        summary: "Global kit ready.",
        issues: [],
        warnings: [],
        runCommand: "codex"
      }
    } as never);

    await (provider as any).launchClaudeFromTools();

    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: `Claude: ${path.basename(root)}`,
      cwd: root
    });
    expect(show).toHaveBeenCalledWith(true);
    expect(sendText).toHaveBeenCalledWith("claude", true);
  });

  it("repairs missing Claude bridge files from Tools when the Logics kit is already healthy", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "agents"), { recursive: true });
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.21.1\n", "utf8");
    fs.writeFileSync(path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "SKILL.md"), "# skill\n", "utf8");
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "agents", "openai.yaml"),
      "tier: core\ninterface:\n  default_prompt: \"Use $logics-hybrid-delivery-assistant for delivery work.\"\n",
      "utf8"
    );
    fs.writeFileSync(path.join(root, "logics", "skills", "logics-flow-manager", "SKILL.md"), "# skill\n", "utf8");
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-flow-manager", "agents", "openai.yaml"),
      "tier: core\ninterface:\n  default_prompt: \"Use $logics-flow-manager for workflow docs.\"\n",
      "utf8"
    );
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = path.join(root, ".claude-global");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Canonical cdx-logics-kit submodule detected."
    });
    vi.mocked(inspectLogicsEnvironment)
      .mockResolvedValueOnce({
        ...defaultEnvironmentSnapshot(root),
        repositoryState: "ready",
        missingWorkflowDirs: [],
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        codexOverlay: {
          status: "healthy",
          summary: "Global kit ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValue({
        ...defaultEnvironmentSnapshot(root),
        repositoryState: "ready",
        missingWorkflowDirs: [],
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        claudeGlobalKit: {
          status: "healthy",
          summary: "Global Claude kit ready.",
          issues: [],
          warnings: [],
          sourceRepo: root,
          publishedSkillNames: ["logics-flow-manager", "logics-hybrid-delivery-assistant"]
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global kit ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never);

    await (provider as any).repairLogicsKitFromTools();

    expect(fs.existsSync(path.join(root, ".claude", "commands", "logics-assist.md"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".claude", "agents", "logics-flow-manager.md"))).toBe(true);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Repair Logics Kit restored Claude bridge files:")
    );
  });

  it("publishes the global kit from Tools when the global kit is missing", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    const show = vi.fn();
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show, sendText });

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
          codexRuntime: { status: "unavailable", summary: "Global kit missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global kit missing.",
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
          codexRuntime: { status: "unavailable", summary: "Global kit missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global kit missing.",
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
      } as never);

    await (provider as any).launchCodexFromTools();

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
  });

  it("can run the canonical kit update directly from environment diagnostics", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: true,
      actionTitle: "Reconcile Logics bootstrap on this branch",
      reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
      missingPaths: ["logics.yaml"],
      convergenceNeeded: true
    });
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
          codexRuntime: { status: "unavailable", summary: "Global kit source unsupported." }
        },
        codexOverlay: {
          status: "missing-manager",
          summary: "This repository does not expose a compatible repo-local Logics kit source for global publication.",
          issues: ["No repo-local Logics skills were found under logics/skills."],
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
    mocks.showQuickPick.mockImplementationOnce(async (items) =>
      items.find((item: { label: string }) => item.label === "Fix now: Update Logics Kit")
    );
    mocks.runGitWithOutput
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // ls-files (gitignore check)
      .mockResolvedValueOnce({ stdout: "git version 2.0.0", stderr: "" })
      .mockResolvedValueOnce({ stdout: "true\n", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: " abc123 logics/skills", stderr: "" })
      .mockResolvedValueOnce({ stdout: "Updating", stderr: "" })
      .mockResolvedValueOnce({ stdout: " def456 logics/skills", stderr: "" });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.checkEnvironmentFromCommand();

    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, ["submodule", "update", "--init", "--remote", "--merge", "--", "logics/skills"]);
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(root, "logics", "skills", "logics.py"),
      ["bootstrap"]
    );
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics kit updated after environment diagnostics. Review and commit the submodule pointer change in your repository when ready. Repo-local bootstrap files were reconciled with the current kit."
    );
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

  describe("migration checks in Check Environment", () => {
    function writeYaml(content: string) {
      fs.writeFileSync(path.join(root, "logics.yaml"), content, "utf-8");
    }

    function readYaml(): string {
      return fs.readFileSync(path.join(root, "logics.yaml"), "utf-8");
    }

    function quickPickItems(): Array<{ label: string; action?: () => Promise<void> }> {
      return mocks.showQuickPick.mock.calls[0][0];
    }

    it("surfaces an Update Kit action when logics/skills/VERSION is below minimum", async () => {
      fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
      fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.5.0", "utf-8");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Update Logics Kit") && i.label.includes("v1.5.0"))).toBe(true);
    });

    it("does not surface kit version item when version meets minimum", async () => {
      fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
      fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.7.1", "utf-8");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      const kitVersionItems = items.filter(
        (i) => i.label.includes("Update Logics Kit") && i.label.includes("minimum recommended")
      );
      expect(kitVersionItems).toHaveLength(0);
    });

    it("surfaces a repair action when logics.yaml is missing mutations and index blocks", async () => {
      writeYaml("version: 1\nworkflow:\n  split:\n    policy: minimal-coherent\n");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Fix now: Complete logics.yaml") && i.label.includes("mutations") && i.label.includes("index"))).toBe(true);
    });

    it("surfaces a bootstrap reconciliation action when canonical bootstrap still needs convergence", async () => {
      mocks.inspectLogicsBootstrapState.mockReturnValue({
        status: "canonical",
        canBootstrap: true,
        actionTitle: "Reconcile Logics bootstrap on this branch",
        reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
        missingPaths: ["logics.yaml"],
        convergenceNeeded: true
      });

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Reconcile Logics bootstrap on this branch"))).toBe(true);
    });

    it("appends missing blocks to logics.yaml when action is triggered", async () => {
      writeYaml("version: 1\n");
      mocks.showQuickPick.mockImplementationOnce(async (items: Array<{ label: string; action?: () => Promise<void> }>) =>
        items.find((i) => i.label.includes("Fix now: Complete logics.yaml"))
      );

      await provider.checkEnvironmentFromCommand();

      const content = readYaml();
      expect(content).toContain("mutations:");
      expect(content).toContain("mode: transactional");
      expect(content).toContain("index:");
      expect(content).toContain("runtime_index.json");
    });

    it("does not surface yaml blocks action when both blocks are present", async () => {
      writeYaml("version: 1\nmutations:\n  mode: transactional\nindex:\n  enabled: true\n");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Fix now: Complete logics.yaml"))).toBe(false);
    });

    it("surfaces a gitignore action when hybrid runtime artifacts are tracked", async () => {
      mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
        if (args[0] === "ls-files") {
          return { stdout: "logics/hybrid_assist_audit.jsonl\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      });

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Optional: Ignore generated runtime artifacts"))).toBe(true);
    });

    it("patches .gitignore when gitignore action is triggered", async () => {
      mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
        if (args[0] === "ls-files") {
          return { stdout: "logics/hybrid_assist_audit.jsonl\nlogics/mutation_audit.jsonl\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      });
      mocks.showQuickPick.mockImplementationOnce(async (items: Array<{ label: string; action?: () => Promise<void> }>) =>
        items.find((i) => i.label.includes("Optional: Ignore generated runtime artifacts"))
      );

      await provider.checkEnvironmentFromCommand();

      const gitignoreContent = fs.readFileSync(path.join(root, ".gitignore"), "utf-8");
      expect(gitignoreContent).toContain("hybrid_assist_audit.jsonl");
      expect(gitignoreContent).toContain("mutation_audit.jsonl");
    });

    it("does not surface gitignore action when no artifacts are tracked", async () => {
      mocks.runGitWithOutput.mockResolvedValue({ stdout: "", stderr: "" });

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Optional: Ignore generated runtime artifacts"))).toBe(false);
    });

    it("surfaces an env placeholder action when no repo env file exists and hybrid providers are configured", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  env_file: .env\n  providers:\n    openai:\n      enabled: true\n"
      );

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Fix now: Update environment credential placeholders"))).toBe(true);
    });

    it("does not surface env placeholder action when an existing env file already carries all provider keys", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    openai:\n      enabled: true\n"
      );
      fs.writeFileSync(path.join(root, ".env.local"), "OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=gm-test\n", "utf-8");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Fix now: Update environment credential placeholders"))).toBe(false);
    });

    it("surfaces env placeholder action when one of several env files is missing provider keys", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    openai:\n      enabled: true\n"
      );
      fs.writeFileSync(path.join(root, ".env"), "OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=gm-test\n", "utf-8");
      fs.writeFileSync(path.join(root, ".env.local"), "OPENAI_API_KEY=sk-test\n", "utf-8");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Fix now: Update environment credential placeholders"))).toBe(true);
    });

    it("surfaces a Logics kit repair action when bridge files are missing", async () => {
      vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
        ...defaultEnvironmentSnapshot(root),
        hybridRuntime: {
          state: "degraded",
          summary: "Runtime degraded.",
          backend: "codex",
          requestedBackend: "auto",
          degraded: true,
          degradedReasons: ["ollama-unreachable"],
          claudeBridgeAvailable: false,
          windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
        }
      } as never);
      mocks.detectClaudeBridgeStatus.mockReturnValue({
        available: false,
        preferredVariant: null,
        detectedVariants: [],
        supportedVariants: ["hybrid-assist", "flow-manager"]
      });

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Repair Logics Kit"))).toBe(true);
    });

    it("surfaces a Claude global kit publish action when the Claude kit is missing", async () => {
      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Publish Global Claude Kit"))).toBe(true);
    });

    it("does not surface Claude bridge repair when bridge is available", async () => {
      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes("Repair Logics Kit"))).toBe(false);
    });

    it("creates logics/.cache directory when absent during Check Environment", async () => {
      const cacheDir = path.join(root, "logics", ".cache");
      expect(fs.existsSync(cacheDir)).toBe(false);

      await provider.checkEnvironmentFromCommand();

      expect(fs.existsSync(cacheDir)).toBe(true);
    });
  });
});
