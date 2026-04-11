import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
  inspectCodexWorkspaceOverlay: vi.fn(),
  inspectClaudeGlobalKit: vi.fn(),
  detectClaudeBridgeStatus: vi.fn()
}));

vi.mock("child_process", () => ({
  execFile: mocks.execFile
}));

vi.mock("../src/logicsCodexWorkspace", () => ({
  inspectCodexWorkspaceOverlay: mocks.inspectCodexWorkspaceOverlay
}));

vi.mock("../src/logicsClaudeGlobalKit", () => ({
  inspectClaudeGlobalKit: mocks.inspectClaudeGlobalKit
}));

vi.mock("../src/logicsEnvironment", () => ({
  detectClaudeBridgeStatus: mocks.detectClaudeBridgeStatus
}));

import { inspectRuntimeLaunchers } from "../src/runtimeLaunchers";

describe("inspectRuntimeLaunchers", () => {
  beforeEach(() => {
    mocks.execFile.mockReset();
    mocks.inspectCodexWorkspaceOverlay.mockReset();
    mocks.inspectClaudeGlobalKit.mockReset();
    mocks.detectClaudeBridgeStatus.mockReset();

    mocks.inspectCodexWorkspaceOverlay.mockReturnValue({
      status: "healthy",
      summary: "Overlay ready.",
      issues: [],
      warnings: []
    });
    mocks.inspectClaudeGlobalKit.mockReturnValue({
      status: "healthy",
      summary: "Global Claude Logics kit is ready.",
      issues: [],
      warnings: []
    });
    mocks.detectClaudeBridgeStatus.mockReturnValue({
      available: true,
      preferredVariant: "flow-manager",
      detectedVariants: ["flow-manager"],
      supportedVariants: ["hybrid-assist", "flow-manager"]
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("detects launchers from PATH using the default command detection", async () => {
    mocks.execFile.mockImplementation((command: string, args: string[], callback: (error: Error | null, stdout?: string) => void) => {
      if (args[0] === "--version") {
        callback(null, `${command} version 1.0.0`, "");
        return;
      }
      callback(new Error(`unexpected args: ${args.join(" ")}`), "");
    });

    const snapshot = await inspectRuntimeLaunchers("/workspace");

    expect(snapshot.hasCodex).toBe(true);
    expect(snapshot.hasClaude).toBe(true);
    expect(snapshot.codex.available).toBe(true);
    expect(snapshot.claude.available).toBe(true);
  });

  it("returns false for default command detection when the CLI is missing", async () => {
    mocks.execFile.mockImplementation((command: string, args: string[], callback: (error: Error | null, stdout?: string) => void) => {
      callback(new Error(`${command}: not found`), "");
    });

    const snapshot = await inspectRuntimeLaunchers("/workspace");

    expect(snapshot.hasCodex).toBe(false);
    expect(snapshot.hasClaude).toBe(false);
    expect(snapshot.codex.available).toBe(false);
    expect(snapshot.claude.available).toBe(false);
  });

  it("disables both launchers when no project root is selected", async () => {
    const snapshot = await inspectRuntimeLaunchers(null, {
      detectCommand: async () => true
    });

    expect(snapshot.codex.available).toBe(false);
    expect(snapshot.claude.available).toBe(false);
    expect(snapshot.codex.title).toBe("Select a project root first");
    expect(snapshot.claude.title).toBe("Select a project root first");
  });

  it("reports Codex as unavailable when the CLI is missing on PATH", async () => {
    const snapshot = await inspectRuntimeLaunchers("/workspace", {
      detectCommand: async (command) => command !== "codex"
    });

    expect(snapshot.codex.available).toBe(false);
    expect(snapshot.codex.title).toContain("Codex CLI not found on PATH");
    expect(snapshot.claude.available).toBe(true);
  });

  it("reports Claude as unavailable when the CLI is missing on PATH", async () => {
    const snapshot = await inspectRuntimeLaunchers("/workspace", {
      detectCommand: async (command) => command !== "claude"
    });

    expect(snapshot.claude.available).toBe(false);
    expect(snapshot.claude.title).toContain("Claude CLI not found on PATH");
    expect(snapshot.codex.available).toBe(true);
  });

  it("keeps Codex available when the overlay is only in warning state", async () => {
    mocks.inspectCodexWorkspaceOverlay.mockReturnValue({
      status: "warning",
      summary: "Overlay warning.",
      issues: [],
      warnings: ["stale"]
    });

    const snapshot = await inspectRuntimeLaunchers("/workspace", {
      detectCommand: async () => true
    });

    expect(snapshot.codex.available).toBe(true);
    expect(snapshot.codex.title).toContain("globally published Logics kit");
  });

  it("shows the bridge repair title when Claude global kit is unhealthy and bridge files are missing", async () => {
    mocks.inspectClaudeGlobalKit.mockReturnValue({
      status: "stale",
      summary: "",
      issues: ["stale manifest"],
      warnings: [],
      needsPublish: true
    });
    mocks.detectClaudeBridgeStatus.mockReturnValue({
      available: false,
      preferredVariant: null,
      detectedVariants: [],
      supportedVariants: ["hybrid-assist", "flow-manager"]
    });

    const snapshot = await inspectRuntimeLaunchers("/workspace", {
      detectCommand: async () => true
    });

    expect(snapshot.claude.available).toBe(false);
    expect(snapshot.claude.title).toContain("bridge files are missing");
  });
});
