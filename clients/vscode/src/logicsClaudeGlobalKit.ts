import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";
import { ClaudeBridgeManifest, getGlobalClaudeHome, repairClaudeBridgeFiles } from "./claudeBridgeSupport";

export type ClaudeKitStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "healthy";

export type ClaudeKitSnapshot = {
  status: ClaudeKitStatus;
  summary: string;
  issues: string[];
  warnings: string[];
  claudeHome?: string;
  agentsRoot?: string;
  commandsRoot?: string;
  installedVersion?: string;
  sourceRepo?: string;
  sourceRevision?: string;
  publishedAt?: string;
  publishedSkillNames?: string[];
  needsPublish?: boolean;
};

export type ClaudeGlobalPublishResult = {
  publicationMode: "copy";
  manifestPath: string;
  publishedSkillNames: string[];
};

const MANIFEST_NAME = "logics-global-kit-claude.json";

export function inspectClaudeGlobalKit(root: string | null): ClaudeKitSnapshot {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Select a project root before checking the global Claude runtime state.",
      issues: [],
      warnings: []
    };
  }

  const claudeHome = getGlobalClaudeHome();
  const agentsRoot = path.join(claudeHome, "agents");
  const commandsRoot = path.join(claudeHome, "commands");
  const manifestPath = path.join(claudeHome, MANIFEST_NAME);
  const base: ClaudeKitSnapshot = {
    status: "healthy",
    summary: "Global Claude runtime is ready.",
    issues: [],
    warnings: [],
    claudeHome,
    agentsRoot,
    commandsRoot
  };

  if (!fs.existsSync(manifestPath)) {
    return {
      ...base,
      status: "missing-overlay",
      summary: "No global Claude runtime is published yet.",
      issues: ["Global Claude bridge manifest is missing."],
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  const manifest = readClaudeBridgeManifest(manifestPath);
  if (!manifest) {
    return {
      ...base,
      status: "stale",
      summary: "Global Claude runtime manifest is unreadable.",
      issues: ["Global Claude bridge manifest is unreadable."],
      needsPublish: true
    };
  }

  const issues = validateClaudeBridgeManifest(manifest, claudeHome);
  const status: ClaudeKitStatus = issues.length > 0 ? "stale" : "healthy";
  const summary =
    status === "healthy"
      ? "Global Claude runtime is ready. Launch Claude normally to use it."
      : "Global Claude runtime needs re-publication before it is reliable.";

  return {
    ...base,
    status,
    summary,
    issues,
    warnings: [],
    publishedSkillNames: manifest.bridges.map((bridge) => bridge.id),
    needsPublish: status !== "healthy"
  };
}

export async function publishClaudeGlobalKit(root: string): Promise<ClaudeGlobalPublishResult> {
  const manifestPath = path.join(getGlobalClaudeHome(), MANIFEST_NAME);
  const result = await repairClaudeBridgeFiles(root);
  const manifest = readClaudeBridgeManifest(manifestPath);
  return {
    publicationMode: "copy",
    manifestPath: result.manifestPath ?? manifestPath,
    publishedSkillNames: result.publishedVariantIds.length > 0
      ? result.publishedVariantIds
      : manifest?.bridges.map((bridge) => bridge.id) ?? []
  };
}

export function discoverKitSkills(kitRoot: string): string[] {
  const skillsRoot = path.join(kitRoot, "logics", "skills");
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => {
      const skillRoot = path.join(skillsRoot, entry.name);
      const skillDocPath = path.join(skillRoot, "SKILL.md");
      try {
        const document = parseDocument(fs.readFileSync(skillDocPath, "utf8"), { prettyErrors: false });
        const parsed = document.toJSON();
        if (parsed && typeof parsed === "object") {
          const skillName = (parsed as { name?: unknown }).name;
          if (typeof skillName === "string" && skillName.trim()) {
            return skillName.trim();
          }
        }
      } catch {
        // fall through to folder name
      }
      return path.basename(skillRoot);
    })
    .sort();
}

function readClaudeBridgeManifest(manifestPath: string): ClaudeBridgeManifest | null {
  try {
    const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ClaudeBridgeManifest;
    if (!payload || !Array.isArray(payload.bridges)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function validateClaudeBridgeManifest(manifest: ClaudeBridgeManifest, claudeHome: string): string[] {
  const issues: string[] = [];
  for (const bridge of manifest.bridges) {
    const commandPath = path.join(claudeHome, bridge.command_path.replace(/^\.claude[\\/]/, ""));
    const agentPath = path.join(claudeHome, bridge.agent_path.replace(/^\.claude[\\/]/, ""));
    if (!fs.existsSync(commandPath)) {
      issues.push(`Published Claude bridge destination is missing for \`${bridge.id}\` (command).`);
    }
    if (!fs.existsSync(agentPath)) {
      issues.push(`Published Claude bridge destination is missing for \`${bridge.id}\` (agent).`);
    }
  }
  return issues;
}
