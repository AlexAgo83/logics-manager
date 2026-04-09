import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createWebviewPanel: vi.fn(),
  openExternal: vi.fn(),
  getActionRoot: vi.fn(),
  refresh: vi.fn(),
  openOnboarding: vi.fn(),
  openAbout: vi.fn(),
  buildHtml: vi.fn(() => "<html></html>")
}));

vi.mock("vscode", () => ({
  window: {
    createWebviewPanel: mocks.createWebviewPanel
  },
  env: {
    openExternal: mocks.openExternal
  },
  ViewColumn: {
    Beside: 2
  },
  Uri: {
    parse: vi.fn((value: string) => ({ toString: () => value }))
  }
}));

vi.mock("../src/logicsCorpusInsightsHtml", () => ({
  buildLogicsCorpusInsightsHtml: mocks.buildHtml
}));

import { LogicsCorpusInsightsController } from "../src/logicsCorpusInsightsController";

describe("LogicsCorpusInsightsController", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("routes onboarding footer actions directly from the insights panel", async () => {
    let didReceiveMessage: ((message: { type?: string }) => Promise<void> | void) | undefined;
    const panel = {
      title: "",
      reveal: vi.fn(),
      dispose: vi.fn(),
      webview: {
        html: "",
        onDidReceiveMessage: vi.fn((callback) => {
          didReceiveMessage = callback;
        })
      },
      onDidDispose: vi.fn()
    };
    mocks.createWebviewPanel.mockReturnValue(panel as never);
    mocks.getActionRoot.mockResolvedValue("/workspace/project");
    mocks.refresh.mockResolvedValue(undefined);
    mocks.openOnboarding.mockResolvedValue(undefined);
    mocks.openAbout.mockResolvedValue(undefined);

    const controller = new LogicsCorpusInsightsController({
      context: { extensionUri: {} } as never,
      getActionRoot: mocks.getActionRoot,
      getItems: vi.fn(() => []) as never,
      refresh: mocks.refresh,
      openOnboarding: mocks.openOnboarding,
      openAbout: mocks.openAbout
    });

    await controller.openLogicsInsightsFromTools();
    await didReceiveMessage?.({ type: "open-onboarding" });
    await didReceiveMessage?.({ type: "about" });
    await didReceiveMessage?.({ type: "refresh-report" });

    expect(mocks.openOnboarding).toHaveBeenCalledTimes(1);
    expect(mocks.openAbout).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    expect(panel.reveal).toHaveBeenCalledWith(2, true);
  });
});
