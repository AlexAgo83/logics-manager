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
  getBundledLogicsManagerScriptPath: vi.fn(),
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
  getBundledLogicsManagerScriptPath: mocks.getBundledLogicsManagerScriptPath,
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
        summary: "Repo-local Logics is ready, but the global Codex runtime still needs publication."
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
      windowsSafeEntrypoint: "python -m logics_manager flow assist ..."
    },
    claudeGlobalKit: {
      status: "missing-overlay",
      summary: "No global Claude runtime is published yet.",
      issues: ["Global Claude runtime manifest is missing."],
      warnings: [],
      sourceRepo: "/workspace/mock",
      publishedSkillNames: [],
      needsPublish: true
    },
    codexOverlay: {
      status: "missing-overlay",
      summary: "No global Codex runtime is published yet. Opening this repository can publish it automatically.",
      issues: ["Global Logics runtime manifest is missing."],
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
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        command: "assist",
        kind: "claude-bridge-manifest",
        repo_root: root,
        bridge_count: 4,
        bridges: [
          {
            id: "hybrid-assist",
            title: "Logics Assist",
            command_path: ".claude/commands/logics-assist.md",
            agent_path: ".claude/agents/logics-hybrid-delivery-assistant.md",
            prompt: "Use $logics-hybrid-delivery-assistant for commit-all, summaries, next-step, triage, handoff, or split-suggestion requests.",
            command_content: "# Logics Assist\n",
            agent_content: "# Logics Assist Agent\n"
          },
          {
            id: "request-draft",
            title: "Logics Request Draft",
            command_path: ".claude/commands/logics-request-draft.md",
            agent_path: ".claude/agents/logics-request-draft.md",
            prompt: "Use $logics-hybrid-delivery-assistant for bounded request-draft proposals from a short intent; keep the output proposal-only and do not create files directly.",
            command_content: "# Logics Request Draft\nReviewer nudge:\n",
            agent_content: "# Logics Request Draft Agent\nReviewer nudge:\n"
          },
          {
            id: "spec-first-pass",
            title: "Logics Spec First Pass",
            command_path: ".claude/commands/logics-spec-first-pass.md",
            agent_path: ".claude/agents/logics-spec-first-pass.md",
            prompt: "Use $logics-hybrid-delivery-assistant for bounded spec-first-pass outlines from a backlog item; keep the output proposal-only and operator-reviewed.",
            command_content: "# Logics Spec First Pass\nReviewer nudge:\n",
            agent_content: "# Logics Spec First Pass Agent\nReviewer nudge:\n"
          },
          {
            id: "backlog-groom",
            title: "Logics Backlog Groom",
            command_path: ".claude/commands/logics-backlog-groom.md",
            agent_path: ".claude/agents/logics-backlog-groom.md",
            prompt: "Use $logics-hybrid-delivery-assistant for bounded backlog-groom proposals from a request doc; keep the output proposal-only and reviewable.",
            command_content: "# Logics Backlog Groom\nReviewer nudge:\n",
            agent_content: "# Logics Backlog Groom Agent\nReviewer nudge:\n"
          }
        ]
      }),
      stderr: ""
    });
    mocks.detectClaudeBridgeStatus.mockReturnValue({
      available: true,
      detectedVariants: ["hybrid-assist"],
      canonicalVariants: ["hybrid-assist"]
    });

    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "missing",
      canBootstrap: true,
      actionTitle: "Bootstrap Logics in this project",
      promptMessage: "No logics/ folder found. Bootstrap Logics by provisioning the local runtime?",
      reason: "No logics/ folder found in the selected repository."
    });
    mocks.indexLogics.mockReturnValue([]);
    mocks.createEmptyAgentRegistry.mockReturnValue({ agents: [], issues: [] });
    mocks.loadAgentRegistry.mockReturnValue({ agents: [], issues: [] });
    mocks.getWorkspaceRoot.mockReturnValue(root);
    mocks.hasMultipleWorkspaceFolders.mockReturnValue(false);
    mocks.isExistingDirectory.mockReturnValue(true);
    mocks.areSamePath.mockImplementation((left: string, right: string) => left === right);
    mocks.buildLogicsKitUpdateCommand.mockReturnValue("python3 -m logics_manager bootstrap");
    mocks.detectDangerousGitignorePatterns.mockReturnValue({
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: "No broad .gitignore pattern covering repo-local Logics runtime paths was detected."
    });
    mocks.detectKitInstallType.mockReturnValue("submodule");
    mocks.inspectLogicsKitSubmodule.mockReturnValue({
      exists: true,
      isCanonical: true,
      reason: "Repo-local Logics runtime checkout detected."
    });
    mocks.getBundledLogicsManagerScriptPath.mockReturnValue(path.join(root, "scripts", "logics-manager.py"));
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "logics-manager.py"), "#!/usr/bin/env python\n", "utf8");
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
      summary: "No global Codex runtime is published yet.",
      issues: [],
      warnings: [],
      overlayRoot: path.join(root, ".codex", "skills"),
      codexHome: path.join(root, ".codex"),
      publishedSkillNames: [],
      needsPublish: true
    });
    mocks.inspectClaudeGlobalKit.mockReturnValue({
      status: "missing-overlay",
      summary: "No global Claude runtime is published yet.",
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
        title: "Launch Codex with the globally published Logics runtime",
        command: "codex"
      },
      claude: {
        available: true,
        title: "Launch Claude with the globally published Logics runtime",
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

  it("can publish the global runtime directly from environment diagnostics", async () => {
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Repo-local Logics runtime checkout detected."
    });
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "unavailable", summary: "Global runtime missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global runtime missing.",
          issues: ["Global Logics runtime manifest is missing."],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "unavailable", summary: "Global runtime missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Global runtime missing.",
          issues: ["Global Logics runtime manifest is missing."],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never)
      .mockResolvedValueOnce({
        root,
        repositoryState: "ready",
        hasLogicsDir: true,
        hasBootstrapScript: true,
        missingWorkflowDirs: [],
        git: { available: true },
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        capabilities: {
          readOnly: { status: "available", summary: "ok" },
          workflowMutation: { status: "available", summary: "ok" },
          bootstrapRepair: { status: "available", summary: "ok" },
          diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never);
    mocks.showQuickPick.mockImplementationOnce(async (items) =>
      items.find((item: { label: string }) => item.label === "Fix now: Publish Global Codex Runtime")
    );
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.checkEnvironmentFromCommand();

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Global Codex runtime published after environment diagnostics. Global runtime ready.",
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
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        diagnostics: { status: "available", summary: "ok" },
          codexRuntime: { status: "available", summary: "Global runtime ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
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
        summary: "Global Claude runtime ready.",
        issues: [],
        warnings: [],
        sourceRepo: root,
        publishedSkillNames: ["logics-hybrid-delivery-assistant"]
      },
      codexOverlay: {
        status: "healthy",
        summary: "Global runtime ready.",
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

  it("repairs missing Claude bridge files from Tools when the Logics runtime is already healthy", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "agents"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "VERSION"), "1.21.1\n", "utf8");
    fs.writeFileSync(path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "SKILL.md"), "# skill\n", "utf8");
    fs.writeFileSync(
      path.join(root, "logics", "skills", "logics-hybrid-delivery-assistant", "agents", "openai.yaml"),
      "tier: core\ninterface:\n  default_prompt: \"Use $logics-hybrid-delivery-assistant for delivery work.\"\n",
      "utf8"
    );
    process.env.LOGICS_CLAUDE_GLOBAL_HOME = path.join(root, ".claude-global");
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Repo-local Logics runtime checkout detected."
    });
    vi.mocked(inspectLogicsEnvironment)
      .mockResolvedValueOnce({
        ...defaultEnvironmentSnapshot(root),
        repositoryState: "ready",
        missingWorkflowDirs: [],
        python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
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
          summary: "Global Claude runtime ready.",
          issues: [],
          warnings: [],
          sourceRepo: root,
          publishedSkillNames: ["logics-hybrid-delivery-assistant"]
        },
        codexOverlay: {
          status: "healthy",
          summary: "Global runtime ready.",
          issues: [],
          warnings: [],
          runCommand: "codex"
        }
      } as never);

    await (provider as any).repairLogicsKitFromTools();

    expect(fs.existsSync(path.join(root, ".claude", "commands", "logics-assist.md"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".claude", "agents", "logics-hybrid-delivery-assistant.md"))).toBe(true);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Repair Logics runtime restored Claude bridge files:")
    );
  });

});
