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

  it("routes standalone clone updates through git pull instead of submodule update", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", ".git"), { recursive: true });
    mocks.detectKitInstallType.mockReturnValue("standalone-clone");
    (provider as any).refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      ...defaultEnvironmentSnapshot(root),
      codexOverlay: {
        status: "healthy",
        summary: "Global kit ready.",
        issues: [],
        warnings: [],
        runCommand: "codex"
      }
    } as never);
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
      if (args[0] === "-C" && args[1] === "logics/skills" && args[2] === "pull") {
        return { stdout: "Updating...\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    const updated = await (provider as any).codexWorkflowController.updateLogicsKit(root, "manual update");

    expect(updated).toBe(true);
    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, ["-C", "logics/skills", "pull", "origin", "main"]);
    expect(mocks.runGitWithOutput).not.toHaveBeenCalledWith(
      root,
      ["submodule", "update", "--init", "--remote", "--merge", "--", "logics/skills"]
    );
  });

  it("blocks standalone clone update when the kit clone has uncommitted changes", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", ".git"), { recursive: true });
    mocks.detectKitInstallType.mockReturnValue("standalone-clone");
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
      if (args[0] === "-C" && args[1] === "logics/skills" && args[2] === "status") {
        return { stdout: " M logics.py\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    const updated = await (provider as any).codexWorkflowController.updateLogicsKit(root, "manual update");

    expect(updated).toBe(false);
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      expect.stringContaining("uncommitted changes")
    );
    expect(mocks.runGitWithOutput).not.toHaveBeenCalledWith(root, ["-C", "logics/skills", "pull", "origin", "main"]);
  });

  it("offers fallback copy installation when logics/ is gitignored and the submodule is unavailable", async () => {
    const previousCodexHome = process.env.LOGICS_CODEX_GLOBAL_HOME;
    const previousClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    const globalHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-global-"));
    const claudeHome = fs.mkdtempSync(path.join(os.tmpdir(), "claude-global-"));
    process.env.LOGICS_CODEX_GLOBAL_HOME = globalHome;
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = claudeHome;
    try {
      fs.mkdirSync(path.join(globalHome, "skills"), { recursive: true });
      fs.writeFileSync(path.join(globalHome, "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
      fs.writeFileSync(path.join(globalHome, "skills", "SKILL.md"), "# logics\n", "utf8");
      mocks.inspectCodexWorkspaceOverlay.mockReturnValue({
        status: "healthy",
        summary: "Global Codex Logics kit is ready.",
        issues: [],
        warnings: [],
        codexHome: globalHome,
        overlayRoot: path.join(globalHome, "skills"),
        publishedSkillNames: ["logics"],
        publishedAt: "2026-04-08T00:00:00.000Z",
        needsPublish: false,
        runCommand: "codex"
      });
      mocks.inspectLogicsBootstrapState.mockReturnValue({
        status: "canonical",
        canBootstrap: true,
        actionTitle: "Reconcile Logics bootstrap on this branch",
        reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
        missingPaths: ["logics.yaml"],
        convergenceNeeded: true
      });
      mocks.inspectClaudeGlobalKit.mockReturnValue({
        status: "missing-overlay",
        summary: "No global Claude Logics kit is published yet.",
        issues: [],
        warnings: [],
        claudeHome: claudeHome,
        publishedSkillNames: [],
        needsPublish: true
      });
      mocks.detectKitInstallType.mockReturnValue("plain-copy");
      mocks.detectDangerousGitignorePatterns.mockReturnValue({
        hasDangerousPatterns: true,
        matchedPatterns: ["logics/"],
        reason: "Broad .gitignore pattern(s) cover logics/skills: logics/."
      });
      mocks.showWarningMessage.mockResolvedValue("Install Fallback");
      (provider as any).refresh = vi.fn().mockResolvedValue(undefined);
      vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
        ...defaultEnvironmentSnapshot(root),
        codexOverlay: {
          status: "healthy",
          summary: "Global kit ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never);
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
        return { stdout: "", stderr: "" };
      });
      mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });

      const updated = await (provider as any).codexWorkflowController.updateLogicsKit(root, "manual update");

      expect(updated).toBe(true);
      expect(fs.existsSync(path.join(root, "logics", "skills", "logics.py"))).toBe(true);
      expect(mocks.runGitWithOutput).not.toHaveBeenCalledWith(root, [
        "clone",
        "--branch",
        "main",
        "https://github.com/AlexAgo83/cdx-logics-kit.git",
        "logics/skills"
      ]);
      expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
        root,
        path.join(root, "logics", "skills", "logics.py"),
        ["bootstrap"]
      );
    } finally {
      if (typeof previousCodexHome === "string") {
        process.env.LOGICS_CODEX_GLOBAL_HOME = previousCodexHome;
      } else {
        delete process.env.LOGICS_CODEX_GLOBAL_HOME;
      }
      if (typeof previousClaudeHome === "string") {
        process.env.LOGICS_CLAUDE_GLOBAL_HOME = previousClaudeHome;
      } else {
        delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
      }
    }
  });

  it("falls back to a direct clone when no global kit copy is available", async () => {
    const previousClaudeHome = process.env.LOGICS_CLAUDE_GLOBAL_HOME;
    const claudeHome = fs.mkdtempSync(path.join(os.tmpdir(), "claude-global-"));
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = claudeHome;
    try {
      mocks.detectKitInstallType.mockReturnValue("plain-copy");
      mocks.detectDangerousGitignorePatterns.mockReturnValue({
        hasDangerousPatterns: true,
        matchedPatterns: ["logics/"],
        reason: "Broad .gitignore pattern(s) cover logics/skills: logics/."
      });
      mocks.showWarningMessage.mockResolvedValue("Install Fallback");
      (provider as any).refresh = vi.fn().mockResolvedValue(undefined);
      mocks.inspectLogicsBootstrapState.mockReturnValue({
        status: "canonical",
        canBootstrap: true,
        actionTitle: "Reconcile Logics bootstrap on this branch",
        reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
        missingPaths: ["logics.yaml"],
        convergenceNeeded: true
      });
      vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
        ...defaultEnvironmentSnapshot(root),
        codexOverlay: {
          status: "healthy",
          summary: "Global kit ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never);
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
        if (args[0] === "clone") {
          fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
          fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
          return { stdout: "Cloning into 'logics/skills'...\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      });
      mocks.runPythonWithOutput.mockResolvedValue({ stdout: "", stderr: "" });

      const updated = await (provider as any).codexWorkflowController.updateLogicsKit(root, "manual update");

      expect(updated).toBe(true);
      expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, [
        "clone",
        "--branch",
        "main",
        "https://github.com/AlexAgo83/cdx-logics-kit.git",
        "logics/skills"
      ]);
      expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
        root,
        path.join(root, "logics", "skills", "logics.py"),
        ["bootstrap"]
      );
    } finally {
      if (typeof previousClaudeHome === "string") {
        process.env.LOGICS_CLAUDE_GLOBAL_HOME = previousClaudeHome;
      } else {
        delete process.env.LOGICS_CLAUDE_GLOBAL_HOME;
      }
    }
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
