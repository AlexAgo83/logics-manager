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

});
