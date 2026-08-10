import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runPythonWithOutput: vi.fn()
}));

vi.mock("../clients/vscode/src/logicsProviderUtils", () => ({
  runPythonWithOutput: mocks.runPythonWithOutput
}));

describe("refreshManagedBootstrap", () => {
  beforeEach(() => {
    mocks.runPythonWithOutput.mockReset();
  });

  it("reports no-corpus without treating it as a failure", async () => {
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({ reason: "no_corpus", ok: false }),
      stderr: ""
    });

    const { refreshManagedBootstrap } = await import("../clients/vscode/src/logicsSilentBootstrapRefresh");
    const result = await refreshManagedBootstrap("/workspace");

    expect(result).toEqual({ status: "no-corpus" });
  });

  it("reports unchanged when nothing needed refreshing", async () => {
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({ updated_paths: [], created_paths: [] }),
      stderr: ""
    });

    const { refreshManagedBootstrap } = await import("../clients/vscode/src/logicsSilentBootstrapRefresh");
    const result = await refreshManagedBootstrap("/workspace");

    expect(result).toEqual({ status: "unchanged" });
  });

  it("reports refreshed with the changed paths", async () => {
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: JSON.stringify({ updated_paths: ["logics/instructions.md"], created_paths: [] }),
      stderr: ""
    });

    const { refreshManagedBootstrap } = await import("../clients/vscode/src/logicsSilentBootstrapRefresh");
    const result = await refreshManagedBootstrap("/workspace");

    expect(result).toEqual({ status: "refreshed", updatedPaths: ["logics/instructions.md"] });
  });

  it("reports failed when the underlying command errors", async () => {
    mocks.runPythonWithOutput.mockResolvedValue({
      stdout: "",
      stderr: "logics-manager not found",
      error: new Error("logics-manager not found")
    });

    const { refreshManagedBootstrap } = await import("../clients/vscode/src/logicsSilentBootstrapRefresh");
    const result = await refreshManagedBootstrap("/workspace");

    expect(result).toEqual({ status: "failed", message: "logics-manager not found" });
  });

  it("reports failed on unparseable output instead of throwing", async () => {
    mocks.runPythonWithOutput.mockResolvedValue({ stdout: "not json", stderr: "" });

    const { refreshManagedBootstrap } = await import("../clients/vscode/src/logicsSilentBootstrapRefresh");
    const result = await refreshManagedBootstrap("/workspace");

    expect(result.status).toBe("failed");
  });
});
