import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDocument } from "yaml";

const mocks = vi.hoisted(() => ({
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  withProgress: vi.fn(),
  runPythonWithOutput: vi.fn(),
  inspectGitHubReleaseCapability: vi.fn(),
  runGitCommand: vi.fn()
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

vi.mock("../src/releasePublishSupport", () => ({
  inspectGitHubReleaseCapability: mocks.inspectGitHubReleaseCapability
}));

vi.mock("../src/gitRuntime", () => ({
  runGitCommand: mocks.runGitCommand
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
    mocks.inspectGitHubReleaseCapability.mockReset();
    mocks.runGitCommand.mockReset();
    mocks.withProgress.mockImplementation(async (_options, task) => task());
    mocks.inspectGitHubReleaseCapability.mockResolvedValue({
      available: true,
      title: "Create the release tag, push, and publish the GitHub release"
    });
    mocks.runGitCommand.mockResolvedValue({ stdout: "", stderr: "" });
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

  function ensureRuntimeEntry() {
    fs.mkdirSync(path.join(root, "logics", "skills"), { recursive: true });
    fs.writeFileSync(path.join(root, "logics", "skills", "logics.py"), "#!/usr/bin/env python\n", "utf-8");
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

    it("uses the first available repo env file when only custom env files exist", async () => {
      writeYaml("version: 1\n");
      fs.writeFileSync(path.join(root, ".env.development"), "OPENAI_API_KEY=sk-test\n", "utf-8");
      mocks.showInformationMessage.mockResolvedValue("Enable in logics.yaml");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      expect(readYaml()).toContain("env_file: .env.development");
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

    it("creates a providers block when hybrid_assist exists without one", async () => {
      writeYaml(
        "version: 1\nhybrid_assist:\n  audit_log: logics/.cache/hybrid_assist_audit.jsonl\n  measurement_log: logics/.cache/hybrid_assist_measurements.jsonl\n"
      );
      writeEnvLocal("OPENAI_API_KEY=sk-test\nGEMINI_API_KEY=ai-test\n");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      await item!.action();

      const content = readYaml();
      const parsed = parseDocument(content).toJS() as {
        hybrid_assist?: {
          env_file?: string;
          provider_health_path?: string;
          providers?: {
            readiness_cooldown_seconds?: number;
            openai?: { enabled?: boolean; model?: string };
            gemini?: { enabled?: boolean; model?: string };
          };
        };
      };

      expect(parsed.hybrid_assist?.env_file).toBe(".env.local");
      expect(parsed.hybrid_assist?.provider_health_path).toBe("logics/.cache/provider_health.json");
      expect(parsed.hybrid_assist?.providers?.readiness_cooldown_seconds).toBe(300);
      expect(parsed.hybrid_assist?.providers?.openai?.enabled).toBe(true);
      expect(parsed.hybrid_assist?.providers?.gemini?.enabled).toBe(true);
      expect(content).not.toContain("measurement_log: logics/.cache/hybrid_assist_measurements.jsonl\n    openai:");
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

    it("detects keys from any repo env file, not only .env and .env.local", async () => {
      writeYaml("version: 1\n");
      fs.writeFileSync(path.join(root, ".env.production"), "OPENAI_API_KEY=sk-test\n", "utf-8");

      const item = await controller.buildProviderRemediationQuickPickItem(root);
      expect(item).not.toBeNull();
      expect(item!.label).toContain("openai");
    });
  });

  describe("publishReleaseFromTools", () => {
    it("keeps GitHub publish unavailable when the repository is not compatible", async () => {
      ensureRuntimeEntry();
      mocks.inspectGitHubReleaseCapability.mockResolvedValue({
        available: false,
        title: "Publish Release requires a GitHub remote."
      });

      await controller.publishReleaseFromTools();

      expect(mocks.showWarningMessage).toHaveBeenCalledWith("Publish Release requires a GitHub remote.");
      expect(mocks.runPythonWithOutput).not.toHaveBeenCalled();
    });

    it("persists repo-local consent before auto-updating release and publishing", async () => {
      ensureRuntimeEntry();
      writeYaml("version: 1\n");
      mocks.runPythonWithOutput
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            ok: true,
            ready: true,
            changelog_status: { tag: "v1.2.3" },
            release_branch: {
              name: "release",
              current_branch: "main",
              exists: true,
              needs_update: true,
              can_fast_forward: true,
              suggestion: "Branch 'release' is behind 'main'. Consider updating it before publishing."
            },
            publish_result: { ok: true, blocking: [] }
          }),
          stderr: ""
        })
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            ok: true,
            ready: true,
            changelog_status: { tag: "v1.2.3" },
            publish_result: { ok: true, blocking: [] }
          }),
          stderr: ""
        });
      mocks.showInformationMessage
        .mockResolvedValueOnce("Allow and update release branch")
        .mockResolvedValueOnce(undefined);

      await controller.publishReleaseFromTools();

      const yaml = readYaml();
      expect(yaml).toContain("allow_fast_forward_local_release_branch: true");
      expect(mocks.runGitCommand).toHaveBeenNthCalledWith(1, root, ["switch", "release"]);
      expect(mocks.runGitCommand).toHaveBeenNthCalledWith(2, root, ["merge", "--ff-only", "main"]);
      expect(mocks.runGitCommand).toHaveBeenNthCalledWith(3, root, ["switch", "main"]);
      expect(mocks.runGitCommand).toHaveBeenNthCalledWith(4, root, ["push", "origin", "release"]);
      expect(mocks.runPythonWithOutput).toHaveBeenCalledTimes(2);
    });

    it("reuses existing repo-local consent for future release-branch updates", async () => {
      ensureRuntimeEntry();
      writeYaml(
        "version: 1\nrelease:\n  maintenance:\n    allow_fast_forward_local_release_branch: true\n"
      );
      mocks.runPythonWithOutput
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            ok: true,
            ready: true,
            changelog_status: { tag: "v1.2.4" },
            release_branch: {
              name: "release",
              current_branch: "main",
              exists: true,
              needs_update: true,
              can_fast_forward: true,
              suggestion: "Branch 'release' is behind 'main'. Consider updating it before publishing."
            },
            publish_result: { ok: true, blocking: [] }
          }),
          stderr: ""
        })
        .mockResolvedValueOnce({
          stdout: JSON.stringify({
            ok: true,
            ready: true,
            changelog_status: { tag: "v1.2.4" },
            publish_result: { ok: true, blocking: [] }
          }),
          stderr: ""
        });
      mocks.showInformationMessage
        .mockResolvedValueOnce("Update release branch and publish")
        .mockResolvedValueOnce(undefined);

      await controller.publishReleaseFromTools();

      expect(readYaml()).toContain("allow_fast_forward_local_release_branch: true");
      expect(mocks.runGitCommand).toHaveBeenCalledWith(root, ["push", "origin", "release"]);
      expect(mocks.runPythonWithOutput).toHaveBeenCalledTimes(2);
    });
  });

  describe("prepareReleaseFromTools", () => {
    it("describes deterministic ready checks without implying AI backend usage", async () => {
      ensureRuntimeEntry();
      mocks.runPythonWithOutput.mockResolvedValue({
        stdout: JSON.stringify({
          ok: true,
          ready: true,
          changelog_status: { tag: "v1.21.0" },
          backend_requested: "auto",
          backend_used: "deterministic"
        }),
        stderr: ""
      });

      await controller.prepareReleaseFromTools();

      expect(mocks.showInformationMessage).toHaveBeenCalledWith(
        "Prepare Release checked release readiness. v1.21.0 is ready to publish."
      );
    });
  });
});
