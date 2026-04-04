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
  inspectRuntimeLaunchers: vi.fn()
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

describe("LogicsViewProvider", () => {
  let root: string;
  let provider: LogicsViewProvider;

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
    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.showWarningMessage.mockReset();
    mocks.withProgress.mockReset();
    mocks.showQuickPick.mockReset();
    mocks.clipboardWriteText.mockReset();
    mocks.getCommands.mockReset();
    mocks.executeCommand.mockReset();
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
        title: "Launch Claude in this repository",
        command: "claude"
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
          get: vi.fn().mockReturnValue("1.19.1"),
          update: vi.fn()
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

  it("surfaces the environment capability snapshot through the diagnostic quick pick", async () => {
    await provider.checkEnvironmentFromCommand();

    expect(mocks.showQuickPick).toHaveBeenCalledTimes(1);
    const [items, options] = mocks.showQuickPick.mock.calls[0];
    expect(options.title).toBe("Logics: Check Environment");
    expect(items.some((item: { label: string }) => item.label.includes("Workflow actions: Unavailable"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Partial bootstrap"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Global Codex kit: Needs attention"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Hybrid assist runtime: Degraded"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Codex launch command"))).toBe(true);
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
      "Prompt copied to clipboard. Open a new Codex thread, then paste it into the composer."
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
      items.find((item: { label: string }) => item.label === "Run: Publish Global Codex Kit")
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

    await (provider as any).launchClaudeFromTools();

    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: `Claude: ${path.basename(root)}`,
      cwd: root
    });
    expect(show).toHaveBeenCalledWith(true);
    expect(sendText).toHaveBeenCalledWith("claude", true);
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
      items.find((item: { label: string }) => item.label === "Run: Update Logics Kit")
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
      expect(items.some((i) => i.label.includes("missing logics.yaml blocks") && i.label.includes("mutations") && i.label.includes("index"))).toBe(true);
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
        items.find((i) => i.label.includes("missing logics.yaml blocks"))
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
      expect(items.some((i) => i.label.includes("missing logics.yaml blocks"))).toBe(false);
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
      expect(items.some((i) => i.label.includes("Add hybrid runtime artifacts to .gitignore"))).toBe(true);
    });

    it("patches .gitignore when gitignore action is triggered", async () => {
      mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
        if (args[0] === "ls-files") {
          return { stdout: "logics/hybrid_assist_audit.jsonl\nlogics/mutation_audit.jsonl\n", stderr: "" };
        }
        return { stdout: "", stderr: "" };
      });
      mocks.showQuickPick.mockImplementationOnce(async (items: Array<{ label: string; action?: () => Promise<void> }>) =>
        items.find((i) => i.label.includes("Add hybrid runtime artifacts to .gitignore"))
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
      expect(items.some((i) => i.label.includes("Add hybrid runtime artifacts to .gitignore"))).toBe(false);
    });

    it("surfaces a warning when .env.local is absent and hybrid providers are configured", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  env_file: .env\n  providers:\n    openai:\n      enabled: true\n"
      );

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes(".env.local is missing"))).toBe(true);
    });

    it("does not surface .env.local warning when file already exists", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    openai:\n      enabled: true\n"
      );
      fs.writeFileSync(path.join(root, ".env.local"), "OPENAI_API_KEY=sk-test\n", "utf-8");

      await provider.checkEnvironmentFromCommand();

      const items = quickPickItems();
      expect(items.some((i) => i.label.includes(".env.local is missing"))).toBe(false);
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
