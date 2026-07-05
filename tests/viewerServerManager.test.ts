import { EventEmitter } from "events";
import { describe, expect, it, vi } from "vitest";
import { ChildProcess } from "child_process";
import { parseViewerUrl, ViewerServerManager, withFocus } from "../clients/vscode/src/viewerServerManager";

const tick = () => Promise.resolve();

function fakeChild() {
  const child = new EventEmitter() as ChildProcess & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

describe("viewerServerManager", () => {
  it("parses the local viewer URL from plain or styled output", () => {
    expect(parseViewerUrl("Local: http://127.0.0.1:4321/")).toEqual({
      url: "http://127.0.0.1:4321/",
      port: 4321
    });
    expect(parseViewerUrl("\u001b[36mhttp://localhost:8765/?focus=req_1\u001b[0m")).toEqual({
      url: "http://localhost:8765/?focus=req_1",
      port: 8765
    });
  });

  it("starts the viewer once per root and reuses the ready process", async () => {
    const child = fakeChild();
    const spawnProcess = vi.fn(() => child);
    const manager = new ViewerServerManager({
      extensionRoot: "/extension",
      spawnProcess: spawnProcess as never,
      detectPython: async () => ({ command: "python3", argsPrefix: [], displayLabel: "python3" })
    });

    const first = manager.getOrStart("/repo");
    await tick();
    child.stdout.emit("data", "Local: http://127.0.0.1:3456/\n");
    await expect(first).resolves.toMatchObject({ root: "/repo", url: "http://127.0.0.1:3456/", port: 3456 });

    await expect(manager.getOrStart("/repo")).resolves.toMatchObject({ url: "http://127.0.0.1:3456/" });
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(spawnProcess.mock.calls[0]?.[1]).toEqual([
      "/extension/scripts/logics-manager.py",
      "view",
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--no-open",
      "--yes"
    ]);
  });

  it("adds focus without restarting the reused viewer", async () => {
    const child = fakeChild();
    const manager = new ViewerServerManager({
      extensionRoot: "/extension",
      spawnProcess: vi.fn(() => child) as never,
      detectPython: async () => ({ command: "python3", argsPrefix: [], displayLabel: "python3" })
    });

    const ready = manager.getOrStart("/repo");
    await tick();
    child.stdout.emit("data", "Local: http://127.0.0.1:3456/\n");
    await ready;

    await expect(manager.getOrStart("/repo", "req_001_demo")).resolves.toMatchObject({
      url: "http://127.0.0.1:3456/?focus=req_001_demo"
    });
  });

  it("stops managed processes", async () => {
    const child = fakeChild();
    const manager = new ViewerServerManager({
      extensionRoot: "/extension",
      spawnProcess: vi.fn(() => child) as never,
      detectPython: async () => ({ command: "python3", argsPrefix: [], displayLabel: "python3" })
    });

    const ready = manager.getOrStart("/repo");
    await tick();
    child.stdout.emit("data", "Local: http://127.0.0.1:3456/\n");
    await ready;

    manager.stopAll();
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it("reports missing Python", async () => {
    const manager = new ViewerServerManager({
      extensionRoot: "/extension",
      spawnProcess: vi.fn() as never,
      detectPython: async () => null
    });

    await expect(manager.getOrStart("/repo")).rejects.toThrow("Python 3.10+");
  });
});

describe("withFocus", () => {
  it("sets the viewer focus query parameter", () => {
    expect(withFocus("http://127.0.0.1:1234/?x=1", "item_1")).toBe("http://127.0.0.1:1234/?x=1&focus=item_1");
  });
});
