import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showInputBox: vi.fn(),
  getCreateConfig: vi.fn(),
  getFlowManagerScriptPath: vi.fn(),
  openCreatedDocFromOutput: vi.fn(),
  runPython: vi.fn(),
  runPythonWithOutput: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showInputBox: mocks.showInputBox
  }
}));

vi.mock("../src/logicsProviderUtils", () => ({
  addLinkToSectionOnDisk: vi.fn(),
  findCreatedDocPathFromOutput: vi.fn(),
  getCompanionDocScriptPath: vi.fn(),
  getCreateConfig: mocks.getCreateConfig,
  getFlowManagerScriptPath: mocks.getFlowManagerScriptPath,
  normalizeRelationPath: vi.fn(),
  openCreatedDocFromOutput: mocks.openCreatedDocFromOutput,
  runPython: mocks.runPython,
  runPythonWithOutput: mocks.runPythonWithOutput,
  updateMainHeadingId: vi.fn(),
  updateManagedReferencesForRename: vi.fn()
}));

import { LogicsViewDocumentController } from "../src/logicsViewDocumentController";

describe("LogicsViewDocumentController", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-controller-"));
    fs.mkdirSync(path.join(root, "logics"), { recursive: true });

    mocks.showErrorMessage.mockReset();
    mocks.showInformationMessage.mockReset();
    mocks.showInputBox.mockReset();
    mocks.getCreateConfig.mockReset();
    mocks.getFlowManagerScriptPath.mockReset();
    mocks.openCreatedDocFromOutput.mockReset();
    mocks.runPython.mockReset();
    mocks.runPythonWithOutput.mockReset();

    mocks.showInputBox.mockResolvedValue("Demo item");
    mocks.getCreateConfig.mockReturnValue({ dir: "logics/backlog", prefix: "item_", label: "backlog item" });
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "Wrote /tmp/demo.md", stderr: "" });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("bootstraps and retries when logics exists but the flow manager is missing", async () => {
    let scriptInstalled = false;
    mocks.getFlowManagerScriptPath.mockImplementation(() =>
      scriptInstalled ? path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py") : null
    );

    const maybeOfferBootstrap = vi.fn(async () => {
      scriptInstalled = true;
    });
    const refresh = vi.fn();

    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap,
      refresh,
      refreshAgents: vi.fn(),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(),
      injectPromptIntoCodexChat: vi.fn(),
      getReadPreviewPanel: vi.fn()
    });

    await controller.createItem("backlog");

    expect(maybeOfferBootstrap).toHaveBeenCalledWith(root);
    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(
      root,
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"),
      ["new", "backlog", "--title", "Demo item"]
    );
    expect(mocks.openCreatedDocFromOutput).toHaveBeenCalledWith("Wrote /tmp/demo.md");
    expect(refresh).toHaveBeenCalled();
    expect(mocks.showErrorMessage).not.toHaveBeenCalled();
  });

  it("shows an actionable error when the flow manager is still missing after bootstrap", async () => {
    mocks.getFlowManagerScriptPath.mockReturnValue(null);

    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap: vi.fn(),
      refresh: vi.fn(),
      refreshAgents: vi.fn(),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(),
      injectPromptIntoCodexChat: vi.fn(),
      getReadPreviewPanel: vi.fn()
    });

    await controller.createItem("backlog");

    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
    expect(mocks.showErrorMessage).toHaveBeenCalledWith(
      "Logics flow script not found at logics/skills/logics-flow-manager/scripts/logics_flow.py. Run Bootstrap Logics to install logics/skills."
    );
  });
});
