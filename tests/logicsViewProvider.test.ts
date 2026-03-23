import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showQuickPick: vi.fn(),
  showWarningMessage: vi.fn(),
  createWebviewPanel: vi.fn(),
  createTerminal: vi.fn(),
  openExternal: vi.fn(),
  clipboardWriteText: vi.fn(),
  workspaceStateGet: vi.fn(),
  workspaceStateUpdate: vi.fn(),
  buildLogicsKitUpdateCommand: vi.fn(),
  inspectLogicsKitSubmodule: vi.fn(),
  runGitWithOutput: vi.fn(),
  runPythonWithOutput: vi.fn(),
  hasLogicsSubmodule: vi.fn(),
  indexLogics: vi.fn(),
  createEmptyAgentRegistry: vi.fn(),
  loadAgentRegistry: vi.fn(),
  getWorkspaceRoot: vi.fn(),
  hasMultipleWorkspaceFolders: vi.fn(),
  isExistingDirectory: vi.fn(),
  areSamePath: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showQuickPick: mocks.showQuickPick,
    showWarningMessage: mocks.showWarningMessage,
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
  commands: {
    getCommands: vi.fn(async () => []),
    executeCommand: vi.fn()
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
  hasLogicsSubmodule: mocks.hasLogicsSubmodule,
  hasMultipleWorkspaceFolders: mocks.hasMultipleWorkspaceFolders,
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

vi.mock("../src/logicsEnvironment", () => ({
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
      codexRuntime: {
        status: "unavailable",
        summary: "Repo-local Logics is ready, but the Codex workspace overlay still needs sync."
      }
    },
    codexOverlay: {
      status: "missing-overlay",
      summary: "Repo-local Logics is ready, but the Codex workspace overlay still needs sync.",
      issues: ["Workspace overlay is missing or not initialized."],
      warnings: [],
      syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
      runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
    }
  }))
}));

import { LogicsViewProvider } from "../src/logicsViewProvider";

describe("LogicsViewProvider", () => {
  let root: string;
  let provider: LogicsViewProvider;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-provider-"));
    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.showWarningMessage.mockReset();
    mocks.showQuickPick.mockReset();
    mocks.buildLogicsKitUpdateCommand.mockReset();
    mocks.inspectLogicsKitSubmodule.mockReset();
    mocks.runGitWithOutput.mockReset();
    mocks.runPythonWithOutput.mockReset();
    mocks.hasLogicsSubmodule.mockReset();
    mocks.indexLogics.mockReset();
    mocks.createEmptyAgentRegistry.mockReset();
    mocks.loadAgentRegistry.mockReset();
    mocks.getWorkspaceRoot.mockReset();
    mocks.hasMultipleWorkspaceFolders.mockReset();
    mocks.isExistingDirectory.mockReset();
    mocks.areSamePath.mockReset();
    mocks.createTerminal.mockReset();

    mocks.hasLogicsSubmodule.mockReturnValue(false);
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
    mocks.createTerminal.mockReturnValue({
      show: vi.fn(),
      sendText: vi.fn()
    });

    provider = new LogicsViewProvider(
      {
        extensionUri: {},
        extensionPath: root,
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
    mocks.showInformationMessage.mockResolvedValue("Not now");

    await (provider as any).maybeOfferBootstrap(root);

    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics bootstrap is incomplete. Bootstrap or repair Logics by adding the cdx-logics-kit submodule?",
      "Bootstrap Logics",
      "Not now"
    );
  });

  it("shows an actionable error when bootstrap is requested without git on PATH", async () => {
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

  it("surfaces the environment capability snapshot through the diagnostic quick pick", async () => {
    await provider.checkEnvironmentFromCommand();

    expect(mocks.showQuickPick).toHaveBeenCalledTimes(1);
    const [items, options] = mocks.showQuickPick.mock.calls[0];
    expect(options.title).toBe("Logics: Check Environment");
    expect(items.some((item: { label: string }) => item.label.includes("Workflow actions: Unavailable"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Partial bootstrap"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Codex overlay runtime: Needs attention"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Codex overlay run command"))).toBe(true);
  });

  it("can run overlay sync directly from environment diagnostics", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    mocks.hasLogicsSubmodule.mockReturnValue(true);
    const managerScriptPath = path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_codex_workspace.py");
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
          codexRuntime: { status: "unavailable", summary: "Overlay missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Overlay missing.",
          issues: ["Workspace overlay is missing or not initialized."],
          warnings: [],
          managerScriptPath,
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
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
          codexRuntime: { status: "unavailable", summary: "Overlay missing." }
        },
        codexOverlay: {
          status: "missing-overlay",
          summary: "Overlay missing.",
          issues: ["Workspace overlay is missing or not initialized."],
          warnings: [],
          managerScriptPath,
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
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
          codexRuntime: { status: "available", summary: "Overlay ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Overlay ready.",
          issues: [],
          warnings: [],
          managerScriptPath,
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
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
          codexRuntime: { status: "available", summary: "Overlay ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Overlay ready.",
          issues: [],
          warnings: [],
          managerScriptPath,
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
        }
      } as never);
    mocks.showQuickPick.mockImplementationOnce(async (items) =>
      items.find((item: { label: string }) => item.label === "Run: Sync Codex Overlay")
    );
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "synced", stderr: "" });
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.checkEnvironmentFromCommand();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, managerScriptPath, ["sync"]);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Codex workspace overlay synced after environment diagnostics. Overlay ready.",
      "Launch Codex in Terminal",
      "Copy Overlay Run Command"
    );
  });

  it("can run the canonical kit update directly from environment diagnostics", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.hasLogicsSubmodule.mockReturnValue(true);
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
          codexRuntime: { status: "unavailable", summary: "Manager missing." }
        },
        codexOverlay: {
          status: "missing-manager",
          summary: "Manager missing.",
          issues: ["Overlay manager script is missing."],
          warnings: [],
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
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
          codexRuntime: { status: "available", summary: "Overlay ready." }
        },
        codexOverlay: {
          status: "healthy",
          summary: "Overlay ready.",
          issues: [],
          warnings: [],
          managerScriptPath: path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_codex_workspace.py"),
          syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
          runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
        }
      } as never);
    mocks.showQuickPick.mockImplementationOnce(async (items) =>
      items.find((item: { label: string }) => item.label === "Run: Update Logics Kit")
    );
    mocks.runGitWithOutput
      .mockResolvedValueOnce({ stdout: "git version 2.0.0", stderr: "" })
      .mockResolvedValueOnce({ stdout: "true\n", stderr: "" })
      .mockResolvedValueOnce({ stdout: "", stderr: "" })
      .mockResolvedValueOnce({ stdout: " abc123 logics/skills", stderr: "" })
      .mockResolvedValueOnce({ stdout: "Updating", stderr: "" })
      .mockResolvedValueOnce({ stdout: " def456 logics/skills", stderr: "" });
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.checkEnvironmentFromCommand();

    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, ["submodule", "update", "--init", "--remote", "--merge", "--", "logics/skills"]);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics kit updated after environment diagnostics. Review and commit the submodule pointer change in your repository when ready."
    );
  });

  it("offers a startup notification to update the kit when overlays are unsupported by the current submodule", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.hasLogicsSubmodule.mockReturnValue(true);
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
        summary: "Overlay manager script is missing from logics/skills. Repair or update the Logics kit before relying on Codex workspace overlays.",
        issues: ["Overlay manager script is missing."],
        warnings: [],
        syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      }
    } as never);
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.refresh();
    await provider.refresh();

    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "This repository already has Logics, but the current kit is too old for Codex overlays. Overlay manager script is missing from logics/skills. Repair or update the Logics kit before relying on Codex workspace overlays.",
      "Update Logics Kit",
      "Copy Update Command",
      "Not now"
    );
  });

  it("offers a startup notification to sync the overlay only once per unresolved state", async () => {
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    mocks.hasLogicsSubmodule.mockReturnValue(true);
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
        codexRuntime: { status: "unavailable", summary: "Overlay missing." }
      },
      codexOverlay: {
        status: "missing-overlay",
        summary: "Repo-local Logics is available, but the Codex workspace overlay has not been materialized yet. Run the overlay sync before terminal Codex sessions should see this repo's skills.",
        issues: ["Workspace overlay is missing or not initialized."],
        warnings: [],
        managerScriptPath: path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_codex_workspace.py"),
        syncCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py sync",
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      }
    } as never);
    mocks.showInformationMessage.mockResolvedValue(undefined);

    await provider.refresh();
    await provider.refresh();

    expect(mocks.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Logics is ready in this repository, but the Codex overlay runtime still needs attention. Repo-local Logics is available, but the Codex workspace overlay has not been materialized yet. Run the overlay sync before terminal Codex sessions should see this repo's skills.",
      "Sync Codex Overlay",
      "Copy Overlay Sync Command",
      "Not now"
    );
  });
});
