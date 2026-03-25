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
      hybridAssist: {
        status: "available",
        summary: "Hybrid assist runtime ready (codex fallback)."
      },
      codexRuntime: {
        status: "unavailable",
        summary: "Repo-local Logics is ready, but the Codex workspace overlay still needs sync."
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
    mocks.createWebviewPanel.mockReset();
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
    mocks.runGitWithOutput.mockResolvedValue({
      stdout: "",
      stderr: ""
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
    expect(items.some((item: { label: string }) => item.label.includes("Hybrid assist runtime: Degraded"))).toBe(true);
    expect(items.some((item: { label: string }) => item.label.includes("Codex overlay run command"))).toBe(true);
  });

  it("can surface hybrid runtime status through the shared assist command", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf8");
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({
        ok: true,
        degraded: true,
        degraded_reasons: ["ollama-unreachable"],
        backend: {
          selected_backend: "codex"
        }
      }),
      stderr: ""
    });

    await (provider as any).checkHybridRuntimeFromTools();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, path.join(root, "logics", "skills", "logics.py"), [
      "flow",
      "assist",
      "runtime-status",
      "--format",
      "json"
    ]);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Hybrid assist runtime: Degraded via codex. Degraded reasons: ollama-unreachable."
    );
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
        codexRuntime: { status: "available", summary: "Overlay ready." }
      },
      codexOverlay: {
        status: "healthy",
        summary: "Overlay ready.",
        issues: [],
        warnings: [],
        runCommand: "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex"
      }
    } as never);

    await (provider as any).launchCodexFromTools();

    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: `Codex Overlay: ${path.basename(root)}`,
      cwd: root
    });
    expect(show).toHaveBeenCalledWith(true);
    expect(sendText).toHaveBeenCalledWith(
      "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex",
      true
    );
  });

  it("syncs and launches Codex from Tools when the overlay is missing", async () => {
    fs.mkdirSync(path.join(root, "logics", "skills", "logics-flow-manager", "scripts"), { recursive: true });
    const managerScriptPath = path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_codex_workspace.py");
    const show = vi.fn();
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show, sendText });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "synced", stderr: "" });

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
      } as never);

    await (provider as any).launchCodexFromTools();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, managerScriptPath, ["sync"]);
    expect(sendText).toHaveBeenCalledWith(
      "python logics/skills/logics-flow-manager/scripts/logics_codex_workspace.py run -- codex",
      true
    );
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      "Codex workspace overlay synced after Tools > Launch Codex. Launching Codex in Terminal."
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
