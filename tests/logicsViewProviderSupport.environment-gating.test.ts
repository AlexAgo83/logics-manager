import { describe, expect, it, vi } from "vitest";
import { getEnvironmentOverallState, getEnvironmentSummaryDescription, shouldRecommendCheckEnvironment } from "../src/logicsViewProviderSupport";

vi.mock("vscode", () => ({
  window: {
    showInformationMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn()
  }
}));

function buildSnapshot() {
  return {
    root: "/workspace/mock",
    repositoryState: "ready",
    hasLogicsDir: true,
    hasSkillsDir: true,
    hasFlowManagerScript: true,
    hasBootstrapScript: true,
    missingWorkflowDirs: [],
    git: { available: true },
    python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } },
    codexOverlay: {
      status: "missing-overlay",
      summary: "Global Codex Logics kit has not been published yet.",
      issues: ["Global Logics kit manifest is missing."],
      warnings: []
    },
    claudeGlobalKit: {
      status: "missing-overlay",
      summary: "Global Claude Logics kit has not been published yet.",
      issues: ["Global Claude kit manifest is missing."],
      warnings: []
    },
    hybridRuntime: {
      state: "ready",
      summary: "Hybrid runtime is ready.",
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
      codexRuntime: { status: "unavailable", summary: "ok" },
      diagnostics: { status: "available", summary: "ok" }
    }
  };
}

describe("environment gating", () => {
  it("treats absent Claude and Codex launchers as healthy and quiet", async () => {
    const snapshot = buildSnapshot();
    const launchers = {
      codex: { available: false, title: "Unavailable", command: "codex" },
      claude: { available: false, title: "Unavailable", command: "claude" },
      hasCodex: false,
      hasClaude: false
    };

    expect(getEnvironmentOverallState.call({}, snapshot as never, snapshot.hybridRuntime as never, [], launchers)).toBe("Healthy");
    expect(getEnvironmentSummaryDescription.call({}, snapshot as never, snapshot.hybridRuntime as never, [], launchers)).toBe(
      "Environment healthy - no action required."
    );
  });

  it("still reports Claude and Codex issues when the launchers are present", async () => {
    const snapshot = buildSnapshot();
    const launchers = {
      codex: { available: false, title: "Unavailable", command: "codex" },
      claude: { available: false, title: "Unavailable", command: "claude" },
      hasCodex: true,
      hasClaude: true
    };

    expect(getEnvironmentOverallState.call({}, snapshot as never, snapshot.hybridRuntime as never, [], launchers)).toBe("Degraded");
    expect(getEnvironmentSummaryDescription.call({}, snapshot as never, snapshot.hybridRuntime as never, [], launchers)).not.toBe(
      "Environment healthy - no action required."
    );
  });

  it("does not recommend an environment check solely because Claude or Codex are absent", async () => {
    const snapshot = buildSnapshot();
    const launchers = {
      codex: { available: false, title: "Unavailable", command: "codex" },
      claude: { available: false, title: "Unavailable", command: "claude" },
      hasCodex: false,
      hasClaude: false
    };
    const context = {
      hybridAssistController: {
        buildProviderRemediationQuickPickItem: vi.fn().mockResolvedValue(null)
      },
      buildLogicsYamlBlocksQuickPickItem: vi.fn(() => null),
      buildMissingEnvLocalQuickPickItem: vi.fn(() => null)
    };

    await expect(
      shouldRecommendCheckEnvironment.call(context, "/workspace/mock", snapshot as never, null, launchers)
    ).resolves.toBe(false);
  });
});
