import { execFile } from "child_process";
import { detectClaudeBridgeStatus } from "./logicsEnvironment";
import { inspectClaudeGlobalKit } from "./logicsClaudeGlobalKit";
import { inspectCodexWorkspaceOverlay } from "./logicsCodexWorkspace";

export type RuntimeLauncherState = {
  available: boolean;
  title: string;
  command: string;
};

export type RuntimeLaunchersSnapshot = {
  codex: RuntimeLauncherState;
  claude: RuntimeLauncherState;
};

type DetectorOptions = {
  detectCommand?: (command: string) => Promise<boolean>;
};

export async function inspectRuntimeLaunchers(
  root: string | null,
  options: DetectorOptions = {}
): Promise<RuntimeLaunchersSnapshot> {
  const detectCommand = options.detectCommand ?? detectCommandOnPath;
  const [hasCodex, hasClaude] = await Promise.all([detectCommand("codex"), detectCommand("claude")]);
  const codexOverlay = inspectCodexWorkspaceOverlay(root);
  const claudeGlobalKit = inspectClaudeGlobalKit(root);
  const claudeBridge = root ? detectClaudeBridgeStatus(root) : null;

  return {
    codex: {
      available: Boolean(root) && hasCodex && (codexOverlay.status === "healthy" || codexOverlay.status === "warning"),
      title: !root
        ? "Select a project root first"
        : !hasCodex
          ? "Codex CLI not found on PATH"
          : codexOverlay.status === "healthy" || codexOverlay.status === "warning"
            ? "Launch Codex with the globally published Logics kit"
            : codexOverlay.summary,
      command: "codex"
    },
    claude: {
      available: Boolean(root) && hasClaude && claudeGlobalKit.status === "healthy",
      title: !root
        ? "Select a project root first"
        : !hasClaude
          ? "Claude CLI not found on PATH"
          : claudeGlobalKit.status === "healthy"
            ? "Launch Claude with the globally published Logics kit"
            : claudeGlobalKit.summary ||
              (claudeBridge?.available
                ? "Global Claude Logics kit needs re-publication before it is reliable."
                : "Claude bridge files are missing. Run Repair Logics Kit to restore the bridge."),
      command: "claude"
    }
  };
}

async function detectCommandOnPath(command: string): Promise<boolean> {
  const candidates =
    process.platform === "win32"
      ? [command, `${command}.cmd`, `${command}.exe`]
      : [command];
  for (const candidate of candidates) {
    const ok = await execFileOk(candidate, ["--version"]);
    if (ok) {
      return true;
    }
  }
  return false;
}

function execFileOk(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, args, (error) => resolve(!error));
  });
}
