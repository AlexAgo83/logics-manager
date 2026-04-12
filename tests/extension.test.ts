import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configureGitPathSettingReader: vi.fn(),
  createOutputChannel: vi.fn(),
  createFileSystemWatcher: vi.fn(),
  registerWebviewViewProvider: vi.fn(),
  registerCommand: vi.fn(),
  onDidChangeWorkspaceFolders: vi.fn(),
  getConfiguration: vi.fn()
}));

const provider = {
  refresh: vi.fn(),
  refreshAgentsFromCommand: vi.fn(),
  selectAgentFromPalette: vi.fn(),
  openFromPalette: vi.fn(),
  promoteFromPalette: vi.fn(),
  createRequest: vi.fn(),
  createCompanionDocFromPalette: vi.fn(),
  checkEnvironmentFromCommand: vi.fn(),
  openHybridInsightsFromCommand: vi.fn(),
  openLogicsInsightsFromCommand: vi.fn(),
  openOnboardingFromCommand: vi.fn(),
  triageWorkflowDocFromCommand: vi.fn(),
  assessDiffRiskFromCommand: vi.fn(),
  buildValidationChecklistFromCommand: vi.fn(),
  reviewDocConsistencyFromCommand: vi.fn(),
  getWatcherRoot: vi.fn(() => "/workspace")
};

const watchers: Array<{
  pattern: { root: string; pattern: string };
  didChange?: () => void;
  didCreate?: () => void;
  didDelete?: () => void;
  dispose: ReturnType<typeof vi.fn>;
}> = [];

const commandHandlers = new Map<string, () => void>();
let workspaceFoldersChanged: (() => void) | undefined;
const MockLogicsViewProvider = vi.fn(function () {
  return provider;
});
MockLogicsViewProvider.viewType = "logics.orchestrator";

vi.mock("vscode", () => ({
  window: {
    createOutputChannel: mocks.createOutputChannel,
    registerWebviewViewProvider: mocks.registerWebviewViewProvider
  },
  workspace: {
    createFileSystemWatcher: mocks.createFileSystemWatcher,
    getConfiguration: mocks.getConfiguration,
    onDidChangeWorkspaceFolders: mocks.onDidChangeWorkspaceFolders
  },
  commands: {
    registerCommand: mocks.registerCommand
  },
  Disposable: vi.fn(function (this: { dispose: () => void }, callback: () => void) {
    this.dispose = callback;
  }),
  RelativePattern: vi.fn(function (root: string, pattern: string) {
    return { root, pattern };
  })
}));

vi.mock("../src/gitRuntime", () => ({
  configureGitPathSettingReader: mocks.configureGitPathSettingReader
}));

vi.mock("../src/logicsViewProvider", () => ({
  LogicsViewProvider: MockLogicsViewProvider
}));

describe("extension.activate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.configureGitPathSettingReader.mockReset();
    mocks.createOutputChannel.mockReset();
    mocks.createFileSystemWatcher.mockReset();
    mocks.registerWebviewViewProvider.mockReset();
    mocks.registerCommand.mockReset();
    mocks.onDidChangeWorkspaceFolders.mockReset();
    mocks.getConfiguration.mockReset();
    provider.refresh.mockReset();
    provider.refreshAgentsFromCommand.mockReset();
    provider.selectAgentFromPalette.mockReset();
    provider.openFromPalette.mockReset();
    provider.promoteFromPalette.mockReset();
    provider.createRequest.mockReset();
    provider.createCompanionDocFromPalette.mockReset();
    provider.checkEnvironmentFromCommand.mockReset();
    provider.openHybridInsightsFromCommand.mockReset();
    provider.openLogicsInsightsFromCommand.mockReset();
    provider.openOnboardingFromCommand.mockReset();
    provider.triageWorkflowDocFromCommand.mockReset();
    provider.assessDiffRiskFromCommand.mockReset();
    provider.buildValidationChecklistFromCommand.mockReset();
    provider.reviewDocConsistencyFromCommand.mockReset();
    provider.getWatcherRoot.mockReset();
    provider.getWatcherRoot.mockReturnValue("/workspace");
    watchers.splice(0);
    commandHandlers.clear();
    workspaceFoldersChanged = undefined;
    mocks.createOutputChannel.mockImplementation((name: string) => ({ name, dispose: vi.fn() }));
    mocks.getConfiguration.mockReturnValue({
      get: vi.fn(() => "C:\\Tools\\Git\\bin\\git.exe")
    });
    mocks.onDidChangeWorkspaceFolders.mockImplementation((handler: () => void) => {
      workspaceFoldersChanged = handler;
      return { dispose: vi.fn() };
    });
    mocks.registerWebviewViewProvider.mockReturnValue({ dispose: vi.fn() });
    mocks.registerCommand.mockImplementation((name: string, handler: () => void) => {
      commandHandlers.set(name, handler);
      return { dispose: vi.fn() };
    });
    mocks.createFileSystemWatcher.mockImplementation((pattern: { root: string; pattern: string }) => {
      const watcher: {
        pattern: { root: string; pattern: string };
        didChange?: () => void;
        didCreate?: () => void;
        didDelete?: () => void;
        dispose: ReturnType<typeof vi.fn>;
        onDidChange: typeof vi.fn;
        onDidCreate: typeof vi.fn;
        onDidDelete: typeof vi.fn;
      } = {
        pattern,
        dispose: vi.fn(),
        onDidChange: vi.fn((handler: () => void) => {
          watcher.didChange = handler;
          return { dispose: vi.fn() };
        }),
        onDidCreate: vi.fn((handler: () => void) => {
          watcher.didCreate = handler;
          return { dispose: vi.fn() };
        }),
        onDidDelete: vi.fn((handler: () => void) => {
          watcher.didDelete = handler;
          return { dispose: vi.fn() };
        })
      };
      watchers.push(watcher);
      return watcher;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers the provider, commands, and debounced watchers", async () => {
    const { activate } = await import("../src/extension");
    const context = { subscriptions: [] } as never;

    activate(context);

    expect(mocks.configureGitPathSettingReader).toHaveBeenCalledTimes(1);
    expect(mocks.configureGitPathSettingReader.mock.calls[0]?.[0]()).toBe("C:\\Tools\\Git\\bin\\git.exe");
    expect(mocks.createOutputChannel).toHaveBeenNthCalledWith(1, "Logics Agents");
    expect(mocks.createOutputChannel).toHaveBeenNthCalledWith(2, "Logics Environment");
    expect(provider.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.registerWebviewViewProvider).toHaveBeenCalledWith(
      "logics.orchestrator",
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    );
    expect(mocks.createFileSystemWatcher).toHaveBeenCalledTimes(4);
    expect(watchers.map((watcher) => watcher.pattern.pattern)).toEqual([
      "logics/**/*.{md,markdown,yaml,yml}",
      ".claude/**/*.{md,markdown,yml,yaml}",
      "logics.yaml",
      ".git/HEAD"
    ]);

    commandHandlers.get("logics.refresh")?.();
    commandHandlers.get("logics.checkEnvironment")?.();
    commandHandlers.get("logics.openLogicsInsights")?.();
    commandHandlers.get("logics.openOnboarding")?.();
    expect(provider.refresh).toHaveBeenCalledTimes(2);
    expect(provider.checkEnvironmentFromCommand).toHaveBeenCalledTimes(1);
    expect(provider.openLogicsInsightsFromCommand).toHaveBeenCalledTimes(1);
    expect(provider.openOnboardingFromCommand).toHaveBeenCalledTimes(1);

    watchers[0]?.didChange?.();
    vi.advanceTimersByTime(299);
    expect(provider.refresh).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(provider.refresh).toHaveBeenCalledTimes(3);
  });

  it("accepts git.path configured as a string array", async () => {
    mocks.getConfiguration.mockReturnValue({
      get: vi.fn(() => ["C:\\Tools\\Git\\bin\\git.exe", "C:\\Tools\\Git\\cmd\\git.exe"])
    });

    const { activate } = await import("../src/extension");
    const context = { subscriptions: [] } as never;

    activate(context);

    expect(mocks.configureGitPathSettingReader).toHaveBeenCalledTimes(1);
    expect(mocks.configureGitPathSettingReader.mock.calls[0]?.[0]()).toEqual([
      "C:\\Tools\\Git\\bin\\git.exe",
      "C:\\Tools\\Git\\cmd\\git.exe"
    ]);
  });

  it("returns undefined for invalid git.path values and skips watcher setup when no root is available", async () => {
    provider.getWatcherRoot.mockReturnValue(undefined);
    mocks.getConfiguration.mockReturnValue({
      get: vi.fn(() => ["C:\\Tools\\Git\\bin\\git.exe", 42])
    });

    const { activate } = await import("../src/extension");
    const context = { subscriptions: [] } as never;

    activate(context);

    expect(mocks.configureGitPathSettingReader).toHaveBeenCalledTimes(1);
    expect(mocks.configureGitPathSettingReader.mock.calls[0]?.[0]()).toBeUndefined();
    expect(mocks.createFileSystemWatcher).not.toHaveBeenCalled();
    expect(provider.refresh).toHaveBeenCalledTimes(1);
  });

  it("rebuilds watchers when workspace folders change", async () => {
    const { activate } = await import("../src/extension");
    const context = { subscriptions: [] } as never;

    activate(context);
    expect(mocks.createFileSystemWatcher).toHaveBeenCalledTimes(4);

    workspaceFoldersChanged?.();

    expect(mocks.createFileSystemWatcher).toHaveBeenCalledTimes(8);
    expect(provider.refresh).toHaveBeenCalledTimes(2);
  });

  it("clears an existing refresh timer when watcher changes happen back-to-back", async () => {
    const { activate } = await import("../src/extension");
    const context = { subscriptions: [] } as never;

    activate(context);

    watchers[0]?.didChange?.();
    watchers[0]?.didChange?.();
    vi.advanceTimersByTime(300);

    expect(provider.refresh).toHaveBeenCalledTimes(2);
  });
});
