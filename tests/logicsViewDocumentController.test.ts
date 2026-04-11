import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInputBox: vi.fn(),
  getCreateConfig: vi.fn(),
  getFlowManagerScriptPath: vi.fn(),
  openCreatedDocFromOutput: vi.fn(),
  runPython: vi.fn(),
  runPythonWithOutput: vi.fn()
}));

vi.mock("../src/logicsEnvironment", () => ({
  inspectLogicsEnvironment: vi.fn(async () => ({
    hasLogicsDir: true,
    hasSkillsDir: true,
    hasFlowManagerScript: true,
    python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } }
  }))
}));

vi.mock("vscode", () => ({
  workspace: {
    openTextDocument: vi.fn(async () => ({}) as never)
  },
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showWarningMessage: mocks.showWarningMessage,
    showInputBox: mocks.showInputBox,
    showTextDocument: vi.fn()
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
    mocks.showWarningMessage.mockReset();
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
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: false,
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } }
    } as never);

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
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("flow manager script is missing");
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("Logics: Check Environment");
  });

  it("blocks creation before prompting for input when Python is missing", async () => {
    mocks.getFlowManagerScriptPath.mockReturnValue(
      path.join(root, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py")
    );
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    vi.mocked(inspectLogicsEnvironment).mockResolvedValue({
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      python: { available: false, command: null }
    } as never);

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

    expect(mocks.showInputBox).not.toHaveBeenCalled();
    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
    expect(mocks.showErrorMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("Logics document creation requires Python 3.");
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("cannot install system tools automatically");
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("Logics: Check Environment");
    expect(mocks.showErrorMessage.mock.calls[0][0]).toContain("Read-only Logics browsing remains available.");
  });

  it("resolves preview links back to the native read preview", async () => {
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

    Object.defineProperty(controller, "items", {
      configurable: true,
      value: [
        {
          id: "task_001_followup",
          stage: "task",
          title: "Follow-up task",
          relPath: "logics/tasks/task_001_followup.md",
          path: path.join(root, "logics/tasks/task_001_followup.md")
        }
      ]
    });

    const readSpy = vi.spyOn(controller, "readItem").mockResolvedValue();
    await controller.openLinkedItem("logics/tasks/task_001_followup.md");

    expect(readSpy).toHaveBeenCalledWith("task_001_followup");
  });

  it("sanitizes unresolved linked references before warning the user", async () => {
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

    await controller.openLinkedItem("logics/tasks/task_001_followup.md\n<script>alert(1)</script>");

    expect(mocks.showWarningMessage).toHaveBeenCalledTimes(1);
    expect(mocks.showWarningMessage.mock.calls[0][0]).not.toContain("\n");
    expect(mocks.showWarningMessage.mock.calls[0][0]).toContain(
      "Could not resolve linked Logics document: logics/tasks/task_001_followup.md <script>alert(1)</script>"
    );
  });

  it("covers guided request and doc fixer branches", async () => {
    const maybeOfferBootstrap = vi.fn(async () => {});
    const maybeShowCodexOverlayHandoff = vi.fn(async () => {});
    const refresh = vi.fn(async () => {});
    const refreshAgents = vi.fn(async () => {});
    const setActiveAgent = vi.fn(async () => {});
    const injectPromptIntoCodexChat = vi.fn(async () => {});
    const agentsOutput = { show: vi.fn() };
    const agentState: { agent?: { id: string; displayName: string; defaultPrompt: string } } = {};
    const registryState = { issues: [] as string[] };
    const { inspectLogicsEnvironment } = await import("../src/logicsEnvironment");
    const envMock = vi.mocked(inspectLogicsEnvironment);

    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: agentsOutput as never,
      getItems: () => [],
      getAgentRegistry: () => ({ issues: registryState.issues }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap,
      maybeShowCodexOverlayHandoff,
      refresh,
      refreshAgents,
      findRequestAuthoringAgent: () => agentState.agent as never,
      setActiveAgent,
      injectPromptIntoCodexChat,
      getReadPreviewPanel: vi.fn()
    });

    fs.rmSync(path.join(root, "logics"), { recursive: true, force: true });
    await controller.startGuidedRequestFromTools();
    expect(maybeOfferBootstrap).toHaveBeenCalledWith(root);
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toContain("No logics/ folder found in");

    fs.mkdirSync(path.join(root, "logics"), { recursive: true });
    registryState.issues = [];
    agentState.agent = undefined;
    await controller.startGuidedRequestFromTools();
    expect(agentsOutput.show).not.toHaveBeenCalled();

    registryState.issues = ["validation error"];
    await controller.startGuidedRequestFromTools();
    expect(refreshAgents).toHaveBeenCalledWith("silent", root);
    expect(agentsOutput.show).toHaveBeenCalledWith(true);
    expect(mocks.showWarningMessage.mock.calls.at(-1)?.[0]).toContain("No request-authoring agent found in logics/skills.");

    registryState.issues = [];
    agentState.agent = { id: "agent-007", displayName: "Requester", defaultPrompt: "Write concise requests" };
    await controller.startGuidedRequestFromTools();
    expect(setActiveAgent).toHaveBeenCalledWith("agent-007");
    expect(injectPromptIntoCodexChat).toHaveBeenCalled();
    expect(maybeShowCodexOverlayHandoff).toHaveBeenCalledWith(root, "guided request handoff");
    expect(refresh).toHaveBeenCalled();

    envMock.mockResolvedValue({
      hasLogicsDir: false,
      hasSkillsDir: false,
      hasFlowManagerScript: false,
      python: { available: false, command: null }
    } as never);
    await controller.fixDocs();
    expect(maybeOfferBootstrap).toHaveBeenCalledWith(root);

    envMock.mockResolvedValue({
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      python: { available: false, command: null }
    } as never);
    await controller.fixDocs();
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toContain("Logics doc fixer requires Python 3.");

    envMock.mockResolvedValue({
      hasLogicsDir: true,
      hasSkillsDir: true,
      hasFlowManagerScript: true,
      python: { available: true, command: { command: "python", argsPrefix: [], displayLabel: "python" } }
    } as never);
    mocks.showWarningMessage.mockResolvedValueOnce(undefined);
    await controller.fixDocs();
    expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();

    mocks.showWarningMessage.mockResolvedValueOnce("Run Fix Logics");
    await controller.fixDocs();
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toContain("Logics doc fixer script not found");

    const fixerScriptPath = path.join(root, "logics", "skills", "logics-doc-fixer", "scripts", "fix_logics_docs.py");
    fs.mkdirSync(path.dirname(fixerScriptPath), { recursive: true });
    fs.writeFileSync(fixerScriptPath, "#!/usr/bin/env python3\n", "utf8");
    mocks.showWarningMessage.mockResolvedValueOnce("Run Fix Logics");
    mocks.runPythonWithOutput.mockResolvedValueOnce({ stdout: "ok", stderr: "" });
    await controller.fixDocs();

    expect(mocks.runPythonWithOutput).toHaveBeenCalledWith(root, fixerScriptPath, ["--write"]);
    expect(mocks.showInformationMessage).toHaveBeenCalledWith("Logics docs fixer completed.");
    expect(refresh).toHaveBeenCalled();
  });

  it("covers rename branches", async () => {
    const item = {
      id: "task_001_demo",
      stage: "task",
      title: "Demo task",
      relPath: "logics/tasks/task_001_demo.md",
      path: path.join(root, "logics/tasks/task_001_demo.md")
    };
    fs.mkdirSync(path.dirname(item.path), { recursive: true });
    fs.writeFileSync(item.path, "# Demo task\n\nBody\n", "utf8");

    const refresh = vi.fn(async () => {});
    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [item],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap: vi.fn(async () => {}),
      maybeShowCodexOverlayHandoff: vi.fn(async () => {}),
      refresh,
      refreshAgents: vi.fn(async () => {}),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(async () => {}),
      injectPromptIntoCodexChat: vi.fn(async () => {}),
      getReadPreviewPanel: vi.fn()
    });

    const errorsBeforeInvalidRename = mocks.showErrorMessage.mock.calls.length;
    await controller.renameItem("note_001");
    expect(mocks.showErrorMessage.mock.calls.length).toBe(errorsBeforeInvalidRename);

    mocks.showInputBox.mockResolvedValueOnce(undefined);
    await controller.renameItem("task_001_demo");

    mocks.showInputBox.mockResolvedValueOnce("demo");
    await controller.renameItem("task_001_demo");
    expect(mocks.showInformationMessage.mock.calls.at(-1)?.[0]).toBe("No changes detected.");

    const existingTarget = path.join(root, "logics/tasks/task_001_renamed.md");
    fs.writeFileSync(existingTarget, "# Existing\n", "utf8");
    mocks.showInputBox.mockResolvedValueOnce("renamed");
    await controller.renameItem("task_001_demo");
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toBe("A file with that name already exists.");

    fs.rmSync(existingTarget, { force: true });
    mocks.showInputBox.mockResolvedValueOnce("final");
    await controller.renameItem("task_001_demo");

    const finalPath = path.join(root, "logics/tasks/task_001_final.md");
    expect(fs.existsSync(finalPath)).toBe(true);
    expect(refresh).toHaveBeenCalledWith("task_001_final");
    expect(mocks.showInformationMessage.mock.calls.at(-1)?.[0]).toBe("Renamed entry to task_001_final.");
  });

  it("covers read fallback and invalid promotion branches", async () => {
    const item = {
      id: "spec_002_preview",
      stage: "spec",
      title: "Preview spec",
      relPath: "logics/specs/spec_002_preview.md",
      path: path.join(root, "logics/specs/spec_002_preview.md")
    };

    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [item],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap: vi.fn(async () => {}),
      maybeShowCodexOverlayHandoff: vi.fn(async () => {}),
      refresh: vi.fn(async () => {}),
      refreshAgents: vi.fn(async () => {}),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(async () => {}),
      injectPromptIntoCodexChat: vi.fn(async () => {}),
      getReadPreviewPanel: vi.fn()
    });

    await controller.readItem("spec_002_preview");
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toContain("Could not open rendered Markdown preview");

    await controller.openItem("missing-item");
    await controller.readItem("missing-item");
    await controller.promoteItem("missing-item");
  });

  it("covers companion doc selection and script gating branches", async () => {
    const refresh = vi.fn(async () => {});
    const controllerWithoutItems = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap: vi.fn(async () => {}),
      maybeShowCodexOverlayHandoff: vi.fn(async () => {}),
      refresh,
      refreshAgents: vi.fn(async () => {}),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(async () => {}),
      injectPromptIntoCodexChat: vi.fn(async () => {}),
      getReadPreviewPanel: vi.fn()
    });

    await controllerWithoutItems.createCompanionDocFromPalette("missing-source", "product");
    expect(refresh).toHaveBeenCalled();
    expect(mocks.showInformationMessage).toHaveBeenCalledWith("No Logics items found.");

    const companionItem = {
      id: "req_900_example",
      stage: "request",
      title: "Example request",
      relPath: "logics/request/req_900_example.md",
      path: path.join(root, "logics/request/req_900_example.md"),
      references: [],
      usedBy: []
    };
    fs.mkdirSync(path.dirname(companionItem.path), { recursive: true });
    fs.writeFileSync(companionItem.path, "# Example request\n", "utf8");

    const controller = new LogicsViewDocumentController({
      context: { extensionPath: root } as never,
      agentsOutput: { show: vi.fn() } as never,
      getItems: () => [companionItem as never],
      getAgentRegistry: () => ({ issues: [] }) as never,
      getActionRoot: async () => root,
      maybeOfferBootstrap: vi.fn(async () => {}),
      maybeShowCodexOverlayHandoff: vi.fn(async () => {}),
      refresh: vi.fn(async () => {}),
      refreshAgents: vi.fn(async () => {}),
      findRequestAuthoringAgent: vi.fn(),
      setActiveAgent: vi.fn(async () => {}),
      injectPromptIntoCodexChat: vi.fn(async () => {}),
      getReadPreviewPanel: vi.fn()
    });

    await controller.createCompanionDoc("req_900_example", "product");
    expect(mocks.showErrorMessage.mock.calls.at(-1)?.[0]).toContain(
      "Companion doc creation is blocked because the product brief script is missing"
    );
  });
});
