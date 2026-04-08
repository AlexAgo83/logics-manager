import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchClaudeTerminal, launchCodexOverlayTerminal, maybeShowReadyCodexOverlayHandoff } from "../src/logicsOverlaySupport";

const mocks = vi.hoisted(() => ({
  showInformationMessage: vi.fn(),
  createTerminal: vi.fn(),
  clipboardWriteText: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showInformationMessage: mocks.showInformationMessage,
    createTerminal: mocks.createTerminal
  },
  env: {
    clipboard: {
      writeText: mocks.clipboardWriteText
    }
  }
}));

describe("logicsOverlaySupport", () => {
  beforeEach(() => {
    mocks.showInformationMessage.mockReset();
    mocks.createTerminal.mockReset();
    mocks.clipboardWriteText.mockReset();
  });

  it("does nothing when the overlay is not ready to hand off", async () => {
    await maybeShowReadyCodexOverlayHandoff("/workspace", "bootstrap", {
      status: "error",
      runCommand: "codex"
    } as never);

    expect(mocks.showInformationMessage).not.toHaveBeenCalled();
    expect(mocks.createTerminal).not.toHaveBeenCalled();
    expect(mocks.clipboardWriteText).not.toHaveBeenCalled();
  });

  it("launches a Codex terminal when the user accepts the handoff", async () => {
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show: vi.fn(), sendText });
    mocks.showInformationMessage.mockResolvedValue("Launch Codex in Terminal");

    await maybeShowReadyCodexOverlayHandoff("/workspace/demo-project", "bootstrap", {
      status: "healthy",
      runCommand: "codex"
    } as never);

    expect(mocks.createTerminal).toHaveBeenCalledWith({
      name: "Codex: demo-project",
      cwd: "/workspace/demo-project"
    });
    expect(sendText).toHaveBeenCalledWith("codex", true);
  });

  it("copies the launch command when the user chooses the clipboard path", async () => {
    mocks.showInformationMessage.mockResolvedValue("Copy Codex Launch Command");

    await maybeShowReadyCodexOverlayHandoff("/workspace/demo-project", "bootstrap", {
      status: "warning",
      runCommand: "codex --profile logics"
    } as never);

    expect(mocks.clipboardWriteText).toHaveBeenCalledWith("codex --profile logics");
    expect(mocks.showInformationMessage).toHaveBeenCalledWith("Codex launch command copied to clipboard.");
  });

  it("keeps the direct launch helpers pointed at the expected terminal names", () => {
    const sendText = vi.fn();
    mocks.createTerminal.mockReturnValue({ show: vi.fn(), sendText });

    launchCodexOverlayTerminal("/workspace/demo-project", "codex");
    launchClaudeTerminal("/workspace/demo-project", "claude");

    expect(mocks.createTerminal).toHaveBeenNthCalledWith(1, {
      name: "Codex: demo-project",
      cwd: "/workspace/demo-project"
    });
    expect(mocks.createTerminal).toHaveBeenNthCalledWith(2, {
      name: "Claude: demo-project",
      cwd: "/workspace/demo-project"
    });
  });
});
