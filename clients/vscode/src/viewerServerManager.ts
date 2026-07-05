import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import { detectPythonRuntime, PythonCommand } from "./pythonRuntime";

export type ViewerServer = {
  root: string;
  url: string;
  port: number;
  process: ChildProcess;
};

type ManagedServer = ViewerServer & {
  ready: Promise<ViewerServer>;
  stderr: string;
  stopped: boolean;
};

type SpawnProcess = typeof spawn;

export type ViewerServerManagerOptions = {
  extensionRoot: string;
  spawnProcess?: SpawnProcess;
  detectPython?: () => Promise<PythonCommand | null>;
  readyTimeoutMs?: number;
};

const URL_PATTERN = /https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)(?:\/[^\s]*)?/i;

export class ViewerServerManager {
  private servers: ManagedServer[] = [];
  private readonly spawnProcess: SpawnProcess;
  private readonly detectPython: () => Promise<PythonCommand | null>;
  private readonly readyTimeoutMs: number;

  constructor(private readonly options: ViewerServerManagerOptions) {
    this.spawnProcess = options.spawnProcess ?? spawn;
    this.detectPython = options.detectPython ?? detectPythonRuntime;
    this.readyTimeoutMs = options.readyTimeoutMs ?? 15000;
  }

  async getOrStart(root: string, focus?: string): Promise<ViewerServer> {
    const existing = this.servers.find((server) => !server.stopped && areSamePath(server.root, root));
    if (existing) {
      return focus ? { ...await existing.ready, url: withFocus((await existing.ready).url, focus) } : existing.ready;
    }

    const python = await this.detectPython();
    if (!python) {
      throw new Error("Python 3.10+ interpreter not found. Install Python and retry.");
    }

    const scriptPath = path.join(this.options.extensionRoot, "scripts", "logics-manager.py");
    const args = [
      ...python.argsPrefix,
      scriptPath,
      "view",
      "--host",
      "127.0.0.1",
      "--port",
      "0",
      "--no-open",
      "--yes"
    ];
    const child = this.spawnProcess(python.command, args, {
      cwd: root,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });

    const managed = this.track(root, child);
    this.servers.push(managed);
    const ready = await managed.ready;
    return focus ? { ...ready, url: withFocus(ready.url, focus) } : ready;
  }

  restart(root: string): Promise<ViewerServer> {
    this.stop(root);
    return this.getOrStart(root);
  }

  stop(root: string): void {
    for (const server of this.servers) {
      if (!server.stopped && areSamePath(server.root, root)) {
        server.stopped = true;
        server.process.kill();
      }
    }
    this.servers = this.servers.filter((server) => !areSamePath(server.root, root));
  }

  stopAll(): void {
    for (const server of this.servers) {
      server.stopped = true;
      server.process.kill();
    }
    this.servers = [];
  }

  private track(root: string, child: ChildProcess): ManagedServer {
    let managed: ManagedServer;
    const ready = new Promise<ViewerServer>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for Logics viewer to start.${managed.stderr ? ` ${managed.stderr.trim()}` : ""}`));
      }, this.readyTimeoutMs);
      const finish = (server: ViewerServer) => {
        clearTimeout(timer);
        resolve(server);
      };
      child.stdout?.on("data", (chunk) => {
        const text = stripAnsi(String(chunk));
        const parsed = parseViewerUrl(text);
        if (parsed) {
          finish({ root, url: parsed.url, port: parsed.port, process: child });
        }
      });
      child.stderr?.on("data", (chunk) => {
        managed.stderr = `${managed.stderr}${String(chunk)}`;
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code, signal) => {
        managed.stopped = true;
        this.servers = this.servers.filter((entry) => entry !== managed);
        clearTimeout(timer);
        reject(new Error(`Logics viewer exited before it was ready (${signal ?? code ?? "unknown"}).${managed.stderr ? ` ${managed.stderr.trim()}` : ""}`));
      });
    });

    managed = {
      root,
      url: "",
      port: 0,
      process: child,
      ready,
      stderr: "",
      stopped: false
    };
    managed.ready.then((server) => {
      managed.url = server.url;
      managed.port = server.port;
    }, () => {
      this.servers = this.servers.filter((entry) => entry !== managed);
    });
    return managed;
  }
}

export function parseViewerUrl(text: string): { url: string; port: number } | null {
  const match = stripAnsi(text).match(URL_PATTERN);
  if (!match) {
    return null;
  }
  return {
    url: match[0],
    port: Number.parseInt(match[1], 10)
  };
}

export function withFocus(url: string, focus: string): string {
  const next = new URL(url);
  next.searchParams.set("focus", focus);
  return next.toString();
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function areSamePath(left: string, right: string): boolean {
  const normalize = (value: string) => path.resolve(value).replace(/[\\/]+$/, "");
  const leftPath = normalize(left);
  const rightPath = normalize(right);
  return process.platform === "win32" ? leftPath.toLowerCase() === rightPath.toLowerCase() : leftPath === rightPath;
}
