import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import {
  assessDiffRiskFromCommand,
  bootstrapLogics,
  buildValidationChecklistFromCommand,
  checkEnvironmentFromCommand,
  checkHybridRuntimeFromTools,
  commitAllChangesFromTools,
  createCompanionDoc,
  createCompanionDocFromPalette,
  createItem,
  createRequest,
  addReference,
  addUsedBy,
  fixDocs,
  getEnvironmentSummaryDescription,
  getHtmlForWebview,
  getValidStatusesForItem,
  launchClaudeFromTools,
  launchCodexFromTools,
  maybeOfferBootstrap,
  maybeShowCodexOverlayHandoff,
  openHybridInsightsFromCommand,
  openLogicsInsightsFromCommand,
  openOnboardingFromCommand,
  openAbout,
  openItem,
  notifyInvalidRootOverride,
  postData,
  promoteItem,
  readItem,
  resolveProjectRoot,
  publishReleaseFromTools,
  refreshAgentsFromCommand,
  repairLogicsKitFromTools,
  reviewDocConsistencyFromCommand,
  renameItem,
  startGuidedRequestFromTools,
  suggestNextStepFromTools,
  shouldRecommendCheckEnvironment,
  summarizeChangelogFromTools,
  summarizeValidationFromTools,
  syncCodexOverlayFromTools,
  triageWorkflowDocFromCommand,
  triageWorkflowDocFromTools,
  updateLogicsKitFromTools,
  canResetProjectRoot,
  getStartupKitUpdatePromptStateKey
} from "../src/logicsViewProviderSupport";

vi.mock("vscode", () => ({
  Uri: {
    file: vi.fn((fsPath: string) => ({ fsPath })),
    parse: vi.fn((value: string) => ({ fsPath: value })),
    joinPath: vi.fn((base: { fsPath: string }, ...segments: string[]) => ({
      fsPath: [base.fsPath, ...segments].join("/")
    }))
  },
  workspace: {
    workspaceFolders: []
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showOpenDialog: vi.fn(),
    showQuickPick: vi.fn()
  },
  env: {
    openExternal: vi.fn()
  }
}));

describe("logicsViewProviderSupport more coverage", () => {
  const workspace = vscode.workspace as { workspaceFolders: Array<{ uri: { fsPath: string } }> };

  beforeEach(() => {
    workspace.workspaceFolders = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    workspace.workspaceFolders = [];
  });

  function makeSnapshot(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      root: "/workspace",
      repositoryState: "ready",
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      hasBootstrapScript: true,
      missingWorkflowDirs: [],
      git: { available: true },
      python: { available: true },
      codexOverlay: { status: "healthy", summary: "ok", issues: [], warnings: [] },
      claudeGlobalKit: { status: "healthy", summary: "ok", issues: [], warnings: [] },
      hybridRuntime: {
        state: "ready",
        summary: "Hybrid runtime ready.",
        backend: "codex",
        requestedBackend: "auto",
        degraded: false,
        degradedReasons: [],
        claudeBridgeAvailable: true,
        windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
      },
      capabilities: {
        readOnly: { status: "available", summary: "ok" },
        workflowMutation: { status: "available", summary: "ok" },
        bootstrapRepair: { status: "available", summary: "ok" },
        codexRuntime: { status: "available", summary: "ok" },
        hybridAssist: { status: "available", summary: "ok" }
      },
      ...overrides
    };
  }

  it("covers environment recommendation and summary branches", async () => {
    const launchers = {
      codex: { available: true, title: "Codex", command: "codex" },
      claude: { available: true, title: "Claude", command: "claude" },
      hasCodex: true,
      hasClaude: true
    };
    const host = {
      hybridAssistController: {
        buildProviderRemediationQuickPickItem: vi.fn().mockResolvedValue(null)
      },
      buildLogicsYamlBlocksQuickPickItem: vi.fn(() => null),
      buildMissingEnvLocalQuickPickItem: vi.fn(() => null)
    };

    await expect(
      shouldRecommendCheckEnvironment.call(host, "/workspace", null, null, launchers)
    ).resolves.toBe(true);

    await expect(
      shouldRecommendCheckEnvironment.call(
        host,
        "/workspace",
        makeSnapshot({ repositoryState: "missing-flow-manager" }) as never,
        null,
        launchers
      )
    ).resolves.toBe(true);

    await expect(
      shouldRecommendCheckEnvironment.call(
        host,
        "/workspace",
        makeSnapshot({ git: { available: false }, python: { available: true } }) as never,
        null,
        launchers
      )
    ).resolves.toBe(true);

    await expect(
      shouldRecommendCheckEnvironment.call(
        host,
        "/workspace",
        makeSnapshot({ codexOverlay: { status: "missing-overlay", summary: "missing", issues: [], warnings: [] } }) as never,
        null,
        launchers
      )
    ).resolves.toBe(true);

    await expect(
      shouldRecommendCheckEnvironment.call(
        host,
        "/workspace",
        makeSnapshot({ claudeGlobalKit: { status: "stale", summary: "stale", issues: [], warnings: [] } }) as never,
        null,
        launchers
      )
    ).resolves.toBe(true);

    await expect(
      shouldRecommendCheckEnvironment.call(
        host,
        "/workspace",
        makeSnapshot({
          hybridRuntime: {
            state: "degraded",
            summary: "Hybrid runtime degraded.",
            backend: "codex",
            requestedBackend: "auto",
            degraded: true,
            degradedReasons: ["missing bridge"],
            claudeBridgeAvailable: false,
            windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
          }
        }) as never,
        null,
        launchers
      )
    ).resolves.toBe(true);

    host.hybridAssistController.buildProviderRemediationQuickPickItem.mockResolvedValue({});
    await expect(
      shouldRecommendCheckEnvironment.call(host, "/workspace", makeSnapshot() as never, null, {
        ...launchers,
        hasClaude: false
      })
    ).resolves.toBe(true);

    host.hybridAssistController.buildProviderRemediationQuickPickItem.mockResolvedValue(null);
    host.buildLogicsYamlBlocksQuickPickItem.mockReturnValue({ label: "Fix YAML" });
    await expect(
      shouldRecommendCheckEnvironment.call(host, "/workspace", makeSnapshot() as never, null, {
        ...launchers,
        hasClaude: false
      })
    ).resolves.toBe(true);

    host.buildLogicsYamlBlocksQuickPickItem.mockReturnValue(null);
    await expect(
      shouldRecommendCheckEnvironment.call(host, "/workspace", makeSnapshot() as never, null, {
        ...launchers,
        hasClaude: false
      })
    ).resolves.toBe(false);

    expect(
      getEnvironmentSummaryDescription.call(
        {},
        makeSnapshot({ missingWorkflowDirs: ["logics/tasks"] }) as never,
        makeSnapshot().hybridRuntime as never,
        [{ label: "Fix one" }] as never,
        launchers
      )
    ).toContain("1 degraded state(s)");
  });

  it("covers status resolution helpers and startup keys", () => {
    workspace.workspaceFolders = [{ uri: { fsPath: "/workspace" } }];

    expect(
      getValidStatusesForItem.call({}, { stage: "request" } as never)
    ).toEqual(["Draft", "Ready", "Done", "Archived"]);
    expect(
      getValidStatusesForItem.call({}, { stage: "architecture" } as never)
    ).toContain("Superseded");

    expect(resolveProjectRoot.call({ projectRootOverride: null })).toEqual({ root: "/workspace" });
    expect(canResetProjectRoot.call({ projectRootOverride: "/workspace" })).toBe(false);
    expect(getStartupKitUpdatePromptStateKey.call({}, "/workspace")).toContain("/workspace");
  });

  it("covers invalid override notices and data posting", () => {
    const warning = vi.mocked(vscode.window.showWarningMessage);
    const host = {
      invalidRootNotice: undefined,
      context: {
        workspaceState: { update: vi.fn() },
        extensionUri: {} as never
      },
      view: {
        webview: {
          postMessage: vi.fn()
        }
      }
    };

    notifyInvalidRootOverride.call(host, "/missing/root", true);
    notifyInvalidRootOverride.call(host, "/missing/root", true);
    notifyInvalidRootOverride.call(host, undefined, false);

    expect(warning).toHaveBeenCalledTimes(1);

    postData.call(host, { root: "/workspace", canResetProjectRoot: true });
    expect(host.view.webview.postMessage).toHaveBeenCalledWith({
      type: "data",
      payload: { root: "/workspace", canResetProjectRoot: true }
    });
  });

  it("covers command and controller wrappers", async () => {
    const host = {
      checkEnvironmentFromTools: vi.fn().mockResolvedValue(undefined),
      hybridAssistController: {
        openHybridInsightsFromTools: vi.fn().mockResolvedValue(undefined),
        triageWorkflowDocFromTools: vi.fn().mockResolvedValue(undefined),
        assessDiffRiskFromTools: vi.fn().mockResolvedValue(undefined),
        buildValidationChecklistFromTools: vi.fn().mockResolvedValue(undefined),
        reviewDocConsistencyFromTools: vi.fn().mockResolvedValue(undefined),
        checkHybridRuntimeFromTools: vi.fn().mockResolvedValue(undefined),
        commitAllChangesFromTools: vi.fn().mockResolvedValue(undefined),
        suggestNextStepFromTools: vi.fn().mockResolvedValue(undefined),
        summarizeValidationFromTools: vi.fn().mockResolvedValue(undefined),
        summarizeChangelogFromTools: vi.fn().mockResolvedValue(undefined),
        prepareReleaseFromTools: vi.fn().mockResolvedValue(undefined),
        publishReleaseFromTools: vi.fn().mockResolvedValue(undefined)
      },
      logicsCorpusInsightsController: {
        openLogicsInsightsFromTools: vi.fn().mockResolvedValue(undefined)
      },
      documentController: {
        createRequest: vi.fn().mockResolvedValue(undefined),
        startGuidedRequestFromTools: vi.fn().mockResolvedValue(undefined),
        createItem: vi.fn().mockResolvedValue(undefined),
        createCompanionDoc: vi.fn().mockResolvedValue(undefined),
        createCompanionDocFromPalette: vi.fn().mockResolvedValue(undefined),
        fixDocs: vi.fn().mockResolvedValue(undefined),
        openItem: vi.fn().mockResolvedValue(undefined),
        readItem: vi.fn().mockResolvedValue(undefined),
        promoteItem: vi.fn().mockResolvedValue(undefined),
        addReference: vi.fn().mockResolvedValue(undefined),
        addUsedBy: vi.fn().mockResolvedValue(undefined),
        renameItem: vi.fn().mockResolvedValue(undefined)
      },
      codexWorkflowController: {
        launchCodexFromTools: vi.fn().mockResolvedValue(undefined),
        launchClaudeFromTools: vi.fn().mockResolvedValue(undefined),
        updateLogicsKit: vi.fn().mockResolvedValue(undefined),
        syncCodexOverlay: vi.fn().mockResolvedValue(undefined),
        repairLogicsKit: vi.fn().mockResolvedValue(undefined),
        maybeOfferBootstrap: vi.fn().mockResolvedValue(undefined),
        maybeOfferCodexStartupRemediation: vi.fn().mockResolvedValue(undefined),
        maybeShowCodexOverlayHandoff: vi.fn().mockResolvedValue(undefined),
        bootstrapLogics: vi.fn().mockResolvedValue(undefined),
        notifyBootstrapCompletion: vi.fn().mockResolvedValue(undefined)
      },
      getActionRoot: vi.fn().mockResolvedValue("/workspace"),
      openOnboardingPanel: vi.fn(),
      view: {
        webview: {
          html: "",
          postMessage: vi.fn()
        }
      },
      context: {
        extensionUri: {} as never
      }
    };

    await checkEnvironmentFromCommand.call(host);
    await openHybridInsightsFromCommand.call(host);
    await openLogicsInsightsFromCommand.call(host);
    openOnboardingFromCommand.call(host);
    await triageWorkflowDocFromTools.call(host, "item-1");
    await triageWorkflowDocFromCommand.call(host);
    await assessDiffRiskFromCommand.call(host);
    await buildValidationChecklistFromCommand.call(host);
    await reviewDocConsistencyFromCommand.call(host);
    await createRequest.call(host);
    await startGuidedRequestFromTools.call(host);
    await openItem.call(host, "item-1");
    await readItem.call(host, "item-1");
    await promoteItem.call(host, "item-1");
    await addReference.call(host, "item-1");
    await addUsedBy.call(host, "item-1");
    await renameItem.call(host, "item-1");
    await launchCodexFromTools.call(host);
    await launchClaudeFromTools.call(host);
    await createItem.call(host, "task");
    await createCompanionDoc.call(host, "item-1", "product");
    await createCompanionDocFromPalette.call(host, "item-1", "architecture");
    await fixDocs.call(host);
    await checkHybridRuntimeFromTools.call(host);
    await commitAllChangesFromTools.call(host);
    await suggestNextStepFromTools.call(host);
    await summarizeValidationFromTools.call(host);
    await summarizeChangelogFromTools.call(host);
    await updateLogicsKitFromTools.call(host);
    await syncCodexOverlayFromTools.call(host);
    await repairLogicsKitFromTools.call(host);
    await maybeOfferBootstrap.call(host, "/workspace");
    await maybeShowCodexOverlayHandoff.call(host, "/workspace", "manual");
    await bootstrapLogics.call(host, "/workspace");
    await publishReleaseFromTools.call(host);

    const rootlessHost = {
      getActionRoot: vi.fn().mockResolvedValue(null),
      codexWorkflowController: {
        launchCodexFromTools: vi.fn().mockResolvedValue(undefined),
        launchClaudeFromTools: vi.fn().mockResolvedValue(undefined)
      }
    };
    await launchCodexFromTools.call(rootlessHost);
    await launchClaudeFromTools.call(rootlessHost);

    expect(host.checkEnvironmentFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.openHybridInsightsFromTools).toHaveBeenCalledTimes(1);
    expect(host.logicsCorpusInsightsController.openLogicsInsightsFromTools).toHaveBeenCalledTimes(1);
    expect(host.openOnboardingPanel).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.triageWorkflowDocFromTools).toHaveBeenCalledTimes(2);
    expect(host.hybridAssistController.assessDiffRiskFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.buildValidationChecklistFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.reviewDocConsistencyFromTools).toHaveBeenCalledTimes(1);
    expect(host.documentController.createRequest).toHaveBeenCalledTimes(1);
    expect(host.documentController.startGuidedRequestFromTools).toHaveBeenCalledTimes(1);
    expect(host.codexWorkflowController.launchCodexFromTools).toHaveBeenCalledWith("/workspace");
    expect(host.codexWorkflowController.launchClaudeFromTools).toHaveBeenCalledWith("/workspace");
    expect(host.documentController.createItem).toHaveBeenCalledWith("task");
    expect(host.documentController.createCompanionDoc).toHaveBeenCalledWith("item-1", "product");
    expect(host.documentController.createCompanionDocFromPalette).toHaveBeenCalledWith("item-1", "architecture");
    expect(host.documentController.fixDocs).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.checkHybridRuntimeFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.commitAllChangesFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.suggestNextStepFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.summarizeValidationFromTools).toHaveBeenCalledTimes(1);
    expect(host.hybridAssistController.summarizeChangelogFromTools).toHaveBeenCalledTimes(1);
    expect(host.codexWorkflowController.updateLogicsKit).toHaveBeenCalledWith("/workspace", "tools menu");
    expect(host.codexWorkflowController.syncCodexOverlay).toHaveBeenCalledWith("/workspace", "tools menu");
    expect(host.codexWorkflowController.repairLogicsKit).toHaveBeenCalledWith("/workspace");
    expect(host.codexWorkflowController.maybeOfferBootstrap).toHaveBeenCalledWith("/workspace");
    expect(host.codexWorkflowController.maybeShowCodexOverlayHandoff).toHaveBeenCalledWith("/workspace", "manual");
    expect(host.codexWorkflowController.bootstrapLogics).toHaveBeenCalledWith("/workspace");
    expect(host.hybridAssistController.publishReleaseFromTools).toHaveBeenCalledTimes(1);
  });

  it("covers webview and root-sensitive wrappers", async () => {
    const host = {
      context: {
        extensionUri: {} as never
      },
      getActionRoot: vi.fn().mockResolvedValue(null),
      refreshAgents: vi.fn().mockResolvedValue(undefined)
    };

    expect(
      getHtmlForWebview.call(
        host,
        {
          asWebviewUri: vi.fn((uri: { fsPath: string }) => uri),
          cspSource: "vscode-resource"
        } as never
      )
    ).toContain("logics");
    await refreshAgentsFromCommand.call(host);
    host.getActionRoot.mockResolvedValueOnce(process.cwd());
    await refreshAgentsFromCommand.call(host);
    await openAbout.call(host);

    expect(host.refreshAgents).toHaveBeenCalledWith("notify", process.cwd());
    expect(vi.mocked(vscode.env.openExternal)).toHaveBeenCalledTimes(1);
  });
});
