/**
 * req_331/item_690: resolve exactly one installed `logics-manager` CLI per
 * project root, on the same PATH-probe/cache shape `pythonRuntime.ts` already
 * uses for finding a Python interpreter -- new target, not a new mechanism.
 *
 * Only an exact version match with the extension is "compatible". A missing
 * or mismatched runtime is a deterministic, read-only state for the caller to
 * report; this module never falls back to a bundled runtime.
 */
import { execFile } from "child_process";

export type ResolvedLogicsRuntime = {
  command: string;
  version: string;
};

export type LogicsRuntimeResolution =
  | { status: "compatible"; runtime: ResolvedLogicsRuntime }
  | { status: "missing"; reason: string }
  | { status: "mismatched"; installedVersion: string; reason: string };

type ExecResult = {
  stdout: string;
  stderr: string;
  error?: Error;
};

const LOGICS_MANAGER_COMMAND = "logics-manager";

let currentExtensionVersion: string | null = null;
const resolutionCache = new Map<string, Promise<LogicsRuntimeResolution>>();

/** Called once from `activate()`; every later resolution compares against this. */
export function setExtensionVersionForRuntimeResolution(version: string | null): void {
  if (version === currentExtensionVersion) {
    return;
  }
  currentExtensionVersion = version;
  resolutionCache.clear();
}

export function invalidateLogicsRuntimeCache(root?: string): void {
  if (root) {
    resolutionCache.delete(root);
    return;
  }
  resolutionCache.clear();
}

export function parseLogicsManagerVersion(output: string): string | null {
  const match = output.trim().match(/^logics-manager\s+(\S+)/i);
  return match ? match[1] : null;
}

export async function resolveLogicsRuntime(root: string): Promise<LogicsRuntimeResolution> {
  let pending = resolutionCache.get(root);
  if (!pending) {
    pending = detectLogicsRuntime(root);
    resolutionCache.set(root, pending);
  }
  return pending;
}

async function detectLogicsRuntime(root: string): Promise<LogicsRuntimeResolution> {
  const extensionVersion = currentExtensionVersion;
  const result = await execFileWithOutput(LOGICS_MANAGER_COMMAND, ["--version"], root);
  const installedVersion = !result.error ? parseLogicsManagerVersion(result.stdout) : null;
  if (!installedVersion) {
    return {
      status: "missing",
      reason: "No `logics-manager` executable was found on PATH for this project."
    };
  }
  if (!extensionVersion || installedVersion !== extensionVersion) {
    return {
      status: "mismatched",
      installedVersion,
      reason: extensionVersion
        ? `Installed logics-manager ${installedVersion} does not match this extension's ${extensionVersion}.`
        : `Installed logics-manager ${installedVersion} found, but this extension's own version is unknown.`
    };
  }
  return { status: "compatible", runtime: { command: LOGICS_MANAGER_COMMAND, version: installedVersion } };
}

export async function runResolvedLogicsManagerCommand(root: string, args: string[]): Promise<ExecResult> {
  const resolution = await resolveLogicsRuntime(root);
  if (resolution.status !== "compatible") {
    const message = resolution.reason;
    return { error: new Error(message), stdout: "", stderr: message };
  }
  return execFileWithOutput(resolution.runtime.command, args, root);
}

// req_331/item_690 AC3: `logics-manager` installed via npm on Windows is a
// `.cmd` shim; execFile without shell:true cannot launch those directly
// (Node needs cmd.exe to interpret them). A real .exe (pip's console_scripts
// wrapper) launches fine either way, so shell:true is only needed, not harmful,
// on Windows.
function execFileWithOutput(command: string, args: string[], cwd?: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, shell: process.platform === "win32" }, (error, stdout, stderr) => {
      resolve({
        error: error ?? undefined,
        stdout: typeof stdout === "string" ? stdout : String(stdout ?? ""),
        stderr: typeof stderr === "string" ? stderr : String(stderr ?? "")
      });
    });
  });
}
