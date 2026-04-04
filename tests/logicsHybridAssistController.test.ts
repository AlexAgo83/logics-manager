import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  withProgress: vi.fn(),
  runPythonWithOutput: vi.fn()
}));

vi.mock("vscode", () => ({
  window: {
    showErrorMessage: mocks.showErrorMessage,
    showInformationMessage: mocks.showInformationMessage,
    showWarningMessage: mocks.showWarningMessage,
    withProgress: mocks.withProgress
  },
  Uri: { file: vi.fn((v: string) => ({ fsPath: v })) },
  ViewColumn: { Beside: 2 },
  ProgressLocation: { Notification: 15 }
}));

vi.mock("../src/logicsProviderUtils", () => ({
  runPythonWithOutput: mocks.runPythonWithOutput
}));

vi.mock("../src/logicsIndexer", () => ({
  canPromote: vi.fn(),
  indexLogics: vi.fn(() => []),
  isRequestProcessed: vi.fn()
}));

vi.mock("../src/logicsHybridInsightsHtml", () => ({
  buildHybridInsightsHtml: vi.fn(() => "<html></html>")
}));

vi.mock("../src/logicsViewMessages", () => ({
  assertNever: vi.fn(),
  parseHybridInsightsPanelMessage: vi.fn()
}));

import { LogicsHybridAssistController } from "../src/logicsHybridAssistController";

function makeController(root: string) {
  return new LogicsHybridAssistController({
    context: { subscriptions: [] } as never,
    getActionRoot: async () => root,
    getItems: () => [],
    pickItem: async () => undefined,
    refresh: async () => {}
  });
}

describe("LogicsHybridAssistController — provider remediation", () => {
  let root: string;
  let controller: LogicsHybridAssistController;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-hybrid-"));
    controller = makeController(root);
    mocks.showInformationMessage.mockReset();
    mocks.showErrorMessage.mockReset();
    mocks.showWarningMessage.mockReset();
    mocks.withProgress.mockReset();
    mocks.runPythonWithOutput.mockReset();
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function writeYaml(content: string) {
    fs.writeFileSync(path.join(root, "logics.yaml"), content, "utf-8");
  }

  function readYaml(): string {
    return fs.readFileSync(path.join(root, "logics.yaml"), "utf-8");
  }

  function writeEnvLocal(content: string) {
    fs.writeFileSync(path.join(root, ".env.local"), content, "utf-8");
  }

  describe("buildProviderRemediationQuickPickItem", () => {
    it("returns null when logics.yaml does not exist", async () => {
      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).toBeNull();
    });

    it("returns null when no API keys are present in env files", async () => {
      writeYaml("version: 1\n");
      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).toBeNull();
    });

    it("returns null when hybrid_assist block already configures all providers with keys present", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    openai:\n      enabled: true\n    gemini:\n      enabled: true\n"
      );
      writeEnvLocal("OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=ai-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).toBeNull();
    });

    it("returns Enable item when hybrid_assist block is absent and OPENAI_API_KEY is present", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);

      expect(item).not.toBeNull();
      expect(item!.label).toContain("Enable");
      expect(item!.label).toContain("openai");
    });

    it("returns Add item when hybrid_assist block exists but openai entry is missing", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    readiness_cooldown_seconds: 300\n    gemini:\n      enabled: true\n"
      );
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);

      expect(item).not.toBeNull();
      expect(item!.label).toContain("Add");
      expect(item!.label).toContain("openai");
    });

    it("returns item covering multiple providers when keys for both are present", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=ai-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);

      expect(item).not.toBeNull();
      expect(item!.label).toContain("openai");
      expect(item!.label).toContain("gemini");
    });
  });

  describe("applyRemediation — append-block mode", () => {
    it("appends full hybrid_assist block when absent", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");
      mocks.showInformationMessage.mockResolvedValue("Enable in logics.yaml");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      const content = readYaml();
      expect(content).toContain("hybrid_assist:");
      expect(content).toContain("openai:");
      expect(content).toContain("enabled: true");
      expect(content).toContain("gpt-4.1-mini");
    });

    it("uses .env.local as env_file when keys are found there", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");
      mocks.showInformationMessage.mockResolvedValue("Enable in logics.yaml");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      expect(readYaml()).toContain("env_file: .env.local");
    });

    it("uses .env as env_file when keys are only there", async () => {
      writeYaml("version: 1\n");
      fs.writeFileSync(path.join(root, ".env"), "OPENAI_API_KEY=sk-test\n", "utf-8");
      mocks.showInformationMessage.mockResolvedValue("Enable in logics.yaml");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      expect(readYaml()).toContain("env_file: .env");
    });
  });

  describe("applyRemediation — insert-provider mode", () => {
    it("inserts missing provider after readiness_cooldown_seconds", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  providers:\n    readiness_cooldown_seconds: 300\n    gemini:\n      enabled: true\n"
      );
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");
      mocks.showInformationMessage.mockResolvedValue("Add openai to logics.yaml");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      const content = readYaml();
      expect(content).toContain("openai:");
      expect(content).toContain("gemini:");
      expect(content).toContain("gpt-4.1-mini");
    });
  });

  describe("readEnvKeys", () => {
    it("reads keys from .env.local with priority over .env", async () => {
      writeYaml("version: 1\n");
      fs.writeFileSync(path.join(root, ".env"), "OTHER_KEY=value\n", "utf-8");
      writeEnvLocal("OPENAI_API_KEY=sk-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).not.toBeNull();
      expect(item!.label).toContain("openai");
    });

    it("skips lines with empty values", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("OPENAI_API_KEY=\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).toBeNull();
    });

    it("skips commented lines", async () => {
      writeYaml("version: 1\n");
      writeEnvLocal("# OPENAI_API_KEY=sk-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).toBeNull();
    });
  });
});
