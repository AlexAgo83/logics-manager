import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runPythonCommand } from "./pythonRuntime";

type ClaudeBridgeManifestEntry = {
  id: string;
  title: string;
  command_path: string;
  agent_path: string;
  prompt: string;
  command_content: string;
  agent_content: string;
};

type ClaudeBridgeManifestPayload = {
  bridges: ClaudeBridgeManifestEntry[];
};

export type ClaudeBridgeManifest = ClaudeBridgeManifestPayload & {
  schema_version: number;
  manifest_kind: "logics-global-kit-claude";
  published_at: string;
  source_repo?: string;
  source_revision?: string;
  publication_mode: "copy";
};

export type ClaudeBridgeRepairOutcome = {
  writtenPaths: string[];
  skippedVariants: string[];
  publishedVariantIds: string[];
  manifestPath?: string;
  failureMessage?: string;
};

export async function repairClaudeBridgeFiles(root: string): Promise<ClaudeBridgeRepairOutcome> {
  const writtenPaths: string[] = [];
  const scriptPath = getBundledLogicsManagerScriptPath();
  const result = await runPythonCommand(root, scriptPath, ["assist", "claude-bridges", "--format", "json"]);
  if (result.error) {
    return {
      writtenPaths: [],
      skippedVariants: [],
      publishedVariantIds: [],
      failureMessage: result.stderr.trim() || result.error.message
    };
  }

  let payload: ClaudeBridgeManifestPayload;
  try {
    payload = JSON.parse(result.stdout) as ClaudeBridgeManifestPayload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      writtenPaths: [],
      skippedVariants: [],
      publishedVariantIds: [],
      failureMessage: `Failed to parse Claude bridge manifest: ${message}`
    };
  }

  const globalHome = getGlobalClaudeHome();
  const manifestPath = path.join(globalHome, "logics-global-kit-claude.json");
  const manifest: ClaudeBridgeManifest = {
    schema_version: 1,
    manifest_kind: "logics-global-kit-claude",
    published_at: new Date().toISOString(),
    publication_mode: "copy",
    bridges: payload.bridges || []
  };

  for (const bridge of payload.bridges || []) {
    const commandPath = toGlobalClaudePath(globalHome, bridge.command_path);
    const agentPath = toGlobalClaudePath(globalHome, bridge.agent_path);

    if (writeFileIfChanged(commandPath, bridge.command_content)) {
      writtenPaths.push(toPosixRelative(globalHome, commandPath));
    }
    if (writeFileIfChanged(agentPath, bridge.agent_content)) {
      writtenPaths.push(toPosixRelative(globalHome, agentPath));
    }
  }

  if (writeFileIfChanged(manifestPath, JSON.stringify(manifest, null, 2) + "\n")) {
    writtenPaths.push(toPosixRelative(globalHome, manifestPath));
  }

  return {
    writtenPaths,
    skippedVariants: [],
    publishedVariantIds: (payload.bridges || []).map((bridge) => bridge.id),
    manifestPath
  };
}

export function getGlobalClaudeHome(): string {
  return path.resolve(process.env.LOGICS_CLAUDE_GLOBAL_HOME || path.join(os.homedir(), ".claude"));
}

function writeFileIfChanged(targetPath: string, content: string): boolean {
  if (fs.existsSync(targetPath)) {
    try {
      if (fs.readFileSync(targetPath, "utf8") === content) {
        return false;
      }
    } catch {
      // fall through and rewrite the file
    }
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function toGlobalClaudePath(globalHome: string, relativeClaudePath: string): string {
  const rel = relativeClaudePath.replace(/^\.claude[\\/]/, "");
  return path.join(globalHome, rel);
}

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).split(path.sep).join("/");
}

function getBundledLogicsManagerScriptPath(): string {
  return path.join(__dirname, "..", "scripts", "logics-manager.py");
}
