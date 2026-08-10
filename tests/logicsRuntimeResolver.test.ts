import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseLogicsManagerVersion } from "../clients/vscode/src/logicsRuntimeResolver";

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("child_process", () => ({
  execFile: execFileMock
}));

describe("logicsRuntimeResolver", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileMock.mockReset();
  });

  it("parses the `logics-manager X.Y.Z` version line", () => {
    expect(parseLogicsManagerVersion("logics-manager 2.21.4\n")).toBe("2.21.4");
    expect(parseLogicsManagerVersion("")).toBeNull();
    expect(parseLogicsManagerVersion("not the right output")).toBeNull();
  });

  it("reports missing when no `logics-manager` is found on PATH", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(new Error("logics-manager not found"), "", "logics-manager not found");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    const resolution = await resolver.resolveLogicsRuntime("/workspace");

    expect(resolution.status).toBe("missing");
  });

  it("reports mismatched when the installed version differs from the extension's", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(null, "logics-manager 2.20.0\n", "");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    const resolution = await resolver.resolveLogicsRuntime("/workspace");

    expect(resolution.status).toBe("mismatched");
    if (resolution.status === "mismatched") {
      expect(resolution.installedVersion).toBe("2.20.0");
    }
  });

  it("reports compatible on an exact version match and caches per root", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(null, "logics-manager 2.21.4\n", "");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    const first = await resolver.resolveLogicsRuntime("/workspace");
    const second = await resolver.resolveLogicsRuntime("/workspace");

    expect(first.status).toBe("compatible");
    expect(second.status).toBe("compatible");
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates the cache for a root and re-probes on the next call", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(null, "logics-manager 2.21.4\n", "");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    await resolver.resolveLogicsRuntime("/workspace");
    resolver.invalidateLogicsRuntimeCache("/workspace");
    await resolver.resolveLogicsRuntime("/workspace");

    expect(execFileMock).toHaveBeenCalledTimes(2);
  });

  it("re-resolves every root when the extension version itself changes", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(null, "logics-manager 2.21.4\n", "");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    const compatible = await resolver.resolveLogicsRuntime("/workspace");
    expect(compatible.status).toBe("compatible");

    resolver.setExtensionVersionForRuntimeResolution("2.22.0");
    const mismatched = await resolver.resolveLogicsRuntime("/workspace");
    expect(mismatched.status).toBe("mismatched");
  });

  it("uses shell:true on win32 so npm's .cmd shim can launch, but not elsewhere", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    execFileMock.mockImplementation((_command: string, _args: string[], options: { shell?: boolean }, callback: (...args: any[]) => void) => {
      expect(options.shell).toBe(true);
      callback(null, "logics-manager 2.21.4\n", "");
    });

    try {
      const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
      resolver.setExtensionVersionForRuntimeResolution("2.21.4");
      await resolver.resolveLogicsRuntime("/workspace");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });

  it("runResolvedLogicsManagerCommand never falls back to a bundled script when unavailable", async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (...args: any[]) => void) => {
      callback(new Error("logics-manager not found"), "", "logics-manager not found");
    });

    const resolver = await import("../clients/vscode/src/logicsRuntimeResolver");
    resolver.setExtensionVersionForRuntimeResolution("2.21.4");
    const result = await resolver.runResolvedLogicsManagerCommand("/workspace", ["flow", "list"]);

    expect(result.error).toBeDefined();
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe("logics-manager");
  });
});
