import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  clipboardWriteText: vi.fn(),
  inspectLogicsEnvironment: vi.fn(),
  inspectLogicsKitSubmodule: vi.fn(),
  inspectLogicsBootstrapState: vi.fn(),
  detectDangerousGitignorePatterns: vi.fn(),
  runGitWithOutput: vi.fn(),
  runPythonWithOutput: vi.fn(),
  buildLogicsKitUpdateCommand: vi.fn(),
  getBundledLogicsManagerScriptPath: vi.fn(),
  detectKitInstallType: vi.fn(),
  shouldPublishRepoKit: vi.fn(),
  publishCodexWorkspaceOverlay: vi.fn(),
  publishClaudeGlobalKit: vi.fn(),
  inspectCodexWorkspaceOverlay: vi.fn(),
  inspectClaudeGlobalKit: vi.fn(),
  inspectRuntimeLaunchers: vi.fn(),
  maybeShowReadyCodexOverlayHandoff: vi.fn(),
  launchClaudeTerminal: vi.fn(),
  launchCodexOverlayTerminal: vi.fn(),
  repairClaudeBridgeFiles: vi.fn(),
  buildMissingGitMessage: vi.fn(() => "Install Git first."),
  isMissingGitFailureDetail: vi.fn(),
  buildMissingPythonMessage: vi.fn(() => "Install Python first."),
  isMissingPythonFailureDetail: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showWarningMessage: mocks.showWarningMessage
  },
  env: {
    clipboard: {
      writeText: mocks.clipboardWriteText
    }
  },
  ProgressLocation: {
    Notification: 15
  }
}));

vi.mock("../src/logicsEnvironment", () => ({
  inspectLogicsEnvironment: mocks.inspectLogicsEnvironment
}));

vi.mock("../src/logicsProviderUtils", () => ({
  buildLogicsKitUpdateCommand: mocks.buildLogicsKitUpdateCommand,
  getBundledLogicsManagerScriptPath: mocks.getBundledLogicsManagerScriptPath,
  detectDangerousGitignorePatterns: mocks.detectDangerousGitignorePatterns,
  detectKitInstallType: mocks.detectKitInstallType,
  inspectLogicsBootstrapState: mocks.inspectLogicsBootstrapState,
  inspectLogicsKitSubmodule: mocks.inspectLogicsKitSubmodule,
  runGitWithOutput: mocks.runGitWithOutput,
  runPythonWithOutput: mocks.runPythonWithOutput
}));

vi.mock("../src/logicsCodexWorkspace", () => ({
  publishCodexWorkspaceOverlay: mocks.publishCodexWorkspaceOverlay,
  shouldPublishRepoKit: mocks.shouldPublishRepoKit,
  inspectCodexWorkspaceOverlay: mocks.inspectCodexWorkspaceOverlay
}));

vi.mock("../src/logicsClaudeGlobalKit", () => ({
  inspectClaudeGlobalKit: mocks.inspectClaudeGlobalKit,
  publishClaudeGlobalKit: mocks.publishClaudeGlobalKit
}));

vi.mock("../src/runtimeLaunchers", () => ({
  inspectRuntimeLaunchers: mocks.inspectRuntimeLaunchers
}));

vi.mock("../src/logicsOverlaySupport", () => ({
  launchClaudeTerminal: mocks.launchClaudeTerminal,
  launchCodexOverlayTerminal: mocks.launchCodexOverlayTerminal,
  maybeShowReadyCodexOverlayHandoff: mocks.maybeShowReadyCodexOverlayHandoff
}));

vi.mock("../src/claudeBridgeSupport", () => ({
  repairClaudeBridgeFiles: mocks.repairClaudeBridgeFiles
}));

vi.mock("../src/gitRuntime", () => ({
  buildMissingGitMessage: mocks.buildMissingGitMessage,
  isMissingGitFailureDetail: mocks.isMissingGitFailureDetail
}));

vi.mock("../src/pythonRuntime", () => ({
  buildMissingPythonMessage: mocks.buildMissingPythonMessage,
  isMissingPythonFailureDetail: mocks.isMissingPythonFailureDetail
}));

import { LogicsCodexWorkflowOperations as LogicsCodexWorkflowController } from "../src/logicsCodexWorkflowOperations";

describe("LogicsCodexWorkflowController", () => {
  const roots: string[] = [];
  let controller: LogicsCodexWorkflowController;
  let refresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    refresh = vi.fn().mockResolvedValue(undefined);
    controller = new LogicsCodexWorkflowController({ refresh });
    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.showWarningMessage.mockReset();
    mocks.clipboardWriteText.mockReset();
    mocks.inspectLogicsEnvironment.mockReset();
    mocks.inspectLogicsKitSubmodule.mockReset();
    mocks.inspectLogicsBootstrapState.mockReset();
    mocks.detectDangerousGitignorePatterns.mockReset();
    mocks.runGitWithOutput.mockReset();
    mocks.runPythonWithOutput.mockReset();
    mocks.buildLogicsKitUpdateCommand.mockReset();
    mocks.getBundledLogicsManagerScriptPath.mockReset();
    mocks.detectKitInstallType.mockReset();
    mocks.shouldPublishRepoKit.mockReset();
    mocks.publishCodexWorkspaceOverlay.mockReset();
    mocks.publishClaudeGlobalKit.mockReset();
    mocks.inspectCodexWorkspaceOverlay.mockReset();
    mocks.inspectClaudeGlobalKit.mockReset();
    mocks.inspectRuntimeLaunchers.mockReset();
    mocks.maybeShowReadyCodexOverlayHandoff.mockReset();
    mocks.launchClaudeTerminal.mockReset();
    mocks.launchCodexOverlayTerminal.mockReset();
    mocks.repairClaudeBridgeFiles.mockReset();
    mocks.buildMissingGitMessage.mockReturnValue("Install Git first.");
    mocks.isMissingGitFailureDetail.mockReset();
    mocks.buildMissingPythonMessage.mockReturnValue("Install Python first.");
    mocks.isMissingPythonFailureDetail.mockReset();
    mocks.shouldPublishRepoKit.mockReturnValue(false);
    mocks.inspectCodexWorkspaceOverlay.mockReturnValue({
      overlayRoot: undefined,
      publishedAt: undefined
    });
    mocks.inspectClaudeGlobalKit.mockReturnValue({
      claudeHome: undefined,
      publishedAt: undefined
    });
    mocks.detectDangerousGitignorePatterns.mockReturnValue({
      hasDangerousPatterns: false,
      matchedPatterns: [],
      reason: ""
    });
    mocks.buildLogicsKitUpdateCommand.mockReturnValue("python3 -m logics_manager bootstrap");
    mocks.getBundledLogicsManagerScriptPath.mockReturnValue(path.join(process.cwd(), "scripts", "logics-manager.py"));
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "Bootstrap: OK", stderr: "" });
  });

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-workflow-controller-"));
    roots.push(root);
    return root;
  }

  function healthySnapshot() {
    return {
      git: { available: true },
      python: { available: true },
      codexOverlay: { status: "healthy", summary: "ready", runCommand: "codex" },
      claudeGlobalKit: { status: "healthy", summary: "ready" }
    };
  }

  it("skips startup remediation when the codex overlay is already healthy", async () => {
    const root = makeRoot();
    mocks.inspectLogicsEnvironment.mockResolvedValue(healthySnapshot());

    await controller.maybeOfferCodexStartupRemediation(root);

    expect(mocks.showInformationMessage).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).not.toHaveBeenCalled();
    expect(mocks.clipboardWriteText).not.toHaveBeenCalled();
  });

  it("offers to copy the runtime update command when startup remediation is blocked by a missing manager", async () => {
    const root = makeRoot();
    mocks.inspectLogicsEnvironment.mockResolvedValue({
      ...healthySnapshot(),
      codexOverlay: { status: "missing-manager", summary: "missing manager", runCommand: null }
    });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: true,
      actionTitle: "Reconcile Logics bootstrap on this branch",
      reason: "Repo-local Logics bootstrap is missing or stale: logics.yaml.",
      missingPaths: ["logics.yaml"],
      convergenceNeeded: true
    });
    mocks.inspectLogicsKitSubmodule.mockReturnValue({
      exists: true,
      isCanonical: true,
      reason: "canonical"
    });
    mocks.showInformationMessage.mockResolvedValue("Copy Update Command");

    await controller.maybeOfferCodexStartupRemediation(root);

    expect(mocks.clipboardWriteText).toHaveBeenCalledWith("python3 -m logics_manager bootstrap");
  });

  it("republishes the global kit when startup remediation can recover a missing overlay", async () => {
    const root = makeRoot();
    mocks.inspectLogicsEnvironment
      .mockResolvedValueOnce({
        ...healthySnapshot(),
        codexOverlay: { status: "missing-overlay", summary: "missing overlay", runCommand: "codex" }
      })
      .mockResolvedValueOnce({
        ...healthySnapshot(),
        codexOverlay: { status: "healthy", summary: "ready", runCommand: "codex" }
      });
    mocks.shouldPublishRepoKit.mockReturnValue(true);

    await controller.maybeOfferCodexStartupRemediation(root);

    expect(mocks.publishCodexWorkspaceOverlay).toHaveBeenCalledWith(root);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mocks.showWarningMessage).not.toHaveBeenCalled();
  });

  it("falls back to a copy command when automatic kit updates are blocked by a plain copy install", async () => {
    const root = makeRoot();
    mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "--version") {
        return { stdout: "git version 2.0", stderr: "" };
      }
      if (key === "rev-parse --is-inside-work-tree") {
        return { stdout: "true", stderr: "" };
      }
      if (key === "status --porcelain") {
        return { stdout: "", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Repo-local Logics bootstrap is converged."
    });
    mocks.inspectLogicsEnvironment.mockResolvedValue(healthySnapshot());

    const updated = await controller.updateLogicsKit(root, "manual repair");

    expect(updated).toBe(true);
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(process.cwd(), "scripts", "logics-manager.py"),
      ["bootstrap"]
    );
  });

  it("runs the bundled bootstrap when unrelated root changes are uncommitted", async () => {
    const root = makeRoot();
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Repo-local Logics bootstrap is converged."
    });
    mocks.inspectLogicsEnvironment.mockResolvedValue(healthySnapshot());
    mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "--version") {
        return { stdout: "git version 2.0", stderr: "" };
      }
      if (key === "rev-parse --is-inside-work-tree") {
        return { stdout: "true", stderr: "" };
      }
      if (key === "status --porcelain") {
        return { stdout: "?? README.md\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    const updated = await controller.updateLogicsKit(root, "manual repair");

    expect(updated).toBe(true);
    expect(mocks.runGitWithOutput).toHaveBeenCalledWith(root, ["status", "--porcelain"]);
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(process.cwd(), "scripts", "logics-manager.py"),
      ["bootstrap"]
    );
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("bundled bootstrap")
    );
  });

  it("runs the bundled bootstrap without treating legacy runtime changes as a blocking update path", async () => {
    const root = makeRoot();
    mocks.runGitWithOutput.mockImplementation(async (_root: string, args: string[]) => {
      const key = args.join(" ");
      if (key === "--version") {
        return { stdout: "git version 2.0", stderr: "" };
      }
      if (key === "rev-parse --is-inside-work-tree") {
        return { stdout: "true", stderr: "" };
      }
      if (key === "status --porcelain") {
        return { stdout: "?? README.md\n M scripts/logics-manager.py\n", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });
    mocks.inspectLogicsBootstrapState.mockReturnValue({
      status: "canonical",
      canBootstrap: false,
      actionTitle: "Bootstrap already completed",
      reason: "Repo-local Logics bootstrap is converged."
    });
    mocks.inspectLogicsEnvironment.mockResolvedValue(healthySnapshot());

    const updated = await controller.updateLogicsKit(root, "manual repair");

    expect(updated).toBe(true);
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(process.cwd(), "scripts", "logics-manager.py"),
      ["bootstrap"]
    );
    expect(mocks.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining("Existing repository changes were left untouched.")
    );
  });

  it("returns false early when Git is unavailable for Logics runtime updates", async () => {
    const root = makeRoot();
    mocks.runGitWithOutput.mockResolvedValue({
      error: new Error("git not found"),
      stdout: "",
      stderr: "git not found"
    });
    mocks.isMissingGitFailureDetail.mockReturnValue(true);

    const updated = await controller.updateLogicsKit(root, "manual repair");

    expect(updated).toBe(false);
    expect(mocks.showErrorMessage).toHaveBeenCalled();
  });
});
