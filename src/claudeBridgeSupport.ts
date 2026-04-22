import * as fs from "fs";
import * as path from "path";
import { getBundledLogicsManagerScriptPath, runPythonWithOutput } from "./logicsProviderUtils";

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

export type ClaudeBridgeRepairOutcome = {
  writtenPaths: string[];
  skippedVariants: string[];
  failureMessage?: string;
};

export async function repairClaudeBridgeFiles(root: string): Promise<ClaudeBridgeRepairOutcome> {
  const writtenPaths: string[] = [];
  const scriptPath = getBundledLogicsManagerScriptPath();
  const result = await runPythonWithOutput(root, scriptPath, ["assist", "claude-bridges", "--format", "json"]);
  if (result.error) {
    return {
      writtenPaths: [],
      skippedVariants: [],
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
      failureMessage: `Failed to parse Claude bridge manifest: ${message}`
    };
  }

  for (const bridge of payload.bridges || []) {
    const commandPath = path.join(root, bridge.command_path);
    const agentPath = path.join(root, bridge.agent_path);

    if (writeFileIfChanged(commandPath, bridge.command_content)) {
      writtenPaths.push(toPosixRelative(root, commandPath));
    }
    if (writeFileIfChanged(agentPath, bridge.agent_content)) {
      writtenPaths.push(toPosixRelative(root, agentPath));
    }
  }

  return {
    writtenPaths,
    skippedVariants: []
  };
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

function toPosixRelative(root: string, targetPath: string): string {
  return path.relative(root, targetPath).split(path.sep).join("/");
}
