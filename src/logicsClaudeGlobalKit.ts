import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseDocument } from "yaml";

export type ClaudeKitStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "healthy";
type SkillTier = "core" | "optional";

type ClaudePublishedEntry = {
  name: string;
  kind: "agent" | "command";
  source_path: string;
  destination_path: string;
  mode: "copy";
  source_mtime_ns?: number;
};

type ClaudeGlobalKitManifest = {
  schema_version?: number;
  manifest_kind?: string;
  installed_version?: string;
  source_repo?: string;
  source_revision?: string;
  published_at?: string;
  publication_mode?: "copy";
  published_skill_entries?: ClaudePublishedEntry[];
};

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
  installedVersion?: string;
  sourceRevision?: string;
  publishedSkillNames: string[];
};

const MANIFEST_NAME = "logics-global-kit-claude.json";
const MANIFEST_SCHEMA_VERSION = 1;
const MANIFEST_KIND = "logics-global-kit-claude";

export function inspectClaudeGlobalKit(root: string | null): ClaudeKitSnapshot {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Select a project root before checking the global Claude Logics kit state.",
      issues: [],
      warnings: []
    };
  }

  const resolvedRoot = path.resolve(root);
  const claudeHome = getGlobalClaudeHome();
  const agentsRoot = path.join(claudeHome, "agents");
  const commandsRoot = path.join(claudeHome, "commands");
  const manifestPath = path.join(claudeHome, MANIFEST_NAME);
  const repoSkillsRoot = path.join(resolvedRoot, "logics", "skills");
  const repoSkillNames = discoverRepoSkillNames(resolvedRoot);
  const repoVersion = readRepoKitVersion(resolvedRoot);
  const repoRevision = readGitRevision(repoSkillsRoot);
  const base: ClaudeKitSnapshot = {
    status: "healthy",
    summary: "Global Claude Logics kit is ready.",
    issues: [],
    warnings: [],
    claudeHome,
    agentsRoot,
    commandsRoot
  };

  if (repoSkillNames.length === 0) {
    return {
      ...base,
      status: "missing-manager",
      summary: "This repository does not expose a compatible repo-local Logics kit source for Claude publication.",
      issues: ["No repo-local Logics skills were found under logics/skills."]
    };
  }

  if (!fs.existsSync(manifestPath)) {
    return {
      ...base,
      status: "missing-overlay",
      summary: "No global Claude Logics kit is published yet.",
      issues: ["Global Claude kit manifest is missing."],
      installedVersion: repoVersion,
      sourceRepo: resolvedRoot,
      sourceRevision: repoRevision,
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  let manifest: ClaudeGlobalKitManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ClaudeGlobalKitManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      status: "stale",
      summary: "Global Claude Logics kit manifest is unreadable.",
      issues: [`Global Claude kit manifest is unreadable: ${message}`],
      needsPublish: true
    };
  }

  const issues: string[] = [];
  const publishedEntries = manifest.published_skill_entries ?? [];
  const publishedSkillNames = Array.from(new Set(publishedEntries.map((entry) => entry.name))).sort();

  if ((manifest.manifest_kind && manifest.manifest_kind !== MANIFEST_KIND) || (manifest.schema_version && manifest.schema_version !== MANIFEST_SCHEMA_VERSION)) {
    issues.push("Global Claude kit manifest schema is unsupported.");
  }

  for (const entry of publishedEntries) {
    if (!fs.existsSync(entry.source_path)) {
      issues.push(`Published Claude kit source is missing for \`${entry.name}\` (${entry.kind}).`);
      continue;
    }
    if (!fs.existsSync(entry.destination_path)) {
      issues.push(`Published Claude kit destination is missing for \`${entry.name}\` (${entry.kind}).`);
      continue;
    }
    const currentSourceMtime = readSkillMtime(entry.source_path);
    if (
      typeof entry.source_mtime_ns === "number" &&
      typeof currentSourceMtime === "number" &&
      entry.source_mtime_ns !== currentSourceMtime
    ) {
      issues.push(`Published Claude kit entry is stale for \`${entry.name}\` (${entry.kind}).`);
    }
  }

  const installedVersion = manifest.installed_version;
  const sourceRepo = manifest.source_repo ? path.resolve(manifest.source_repo) : undefined;
  const sourceRevision = manifest.source_revision;
  if (!installedVersion) {
    issues.push("Published global Claude kit version is missing from the manifest.");
  }
  if (compareVersions(repoVersion, installedVersion) > 0) {
    issues.push(`Repo-local kit version ${repoVersion} is newer than the published Claude version ${installedVersion || "unknown"}.`);
  }
  if (repoRevision && sourceRevision && repoRevision !== sourceRevision && sourceRepo === resolvedRoot) {
    issues.push("Repo-local kit revision differs from the published Claude revision for this repository.");
  }

  const status: ClaudeKitStatus = issues.length > 0 ? "stale" : "healthy";
  const summary =
    status === "healthy"
      ? `Global Claude Logics kit is ready (${installedVersion || "unknown version"}). Launch Claude normally to use it.`
      : "Global Claude Logics kit needs re-publication before it is reliable.";

  return {
    ...base,
    status,
    summary,
    issues,
    warnings: [],
    installedVersion,
    sourceRepo,
    sourceRevision,
    publishedAt: manifest.published_at,
    publishedSkillNames,
    needsPublish: status !== "healthy"
  };
}

export function publishClaudeGlobalKit(root: string): ClaudeGlobalPublishResult {
  const resolvedRoot = path.resolve(root);
  const repoSkills = discoverRepoSkills(resolvedRoot, { includeOptional: true });
  if (repoSkills.length === 0) {
    throw new Error("No repo-local Logics skills found under logics/skills.");
  }

  const claudeHome = getGlobalClaudeHome();
  const agentsRoot = path.join(claudeHome, "agents");
  const commandsRoot = path.join(claudeHome, "commands");
  const manifestPath = path.join(claudeHome, MANIFEST_NAME);
  fs.mkdirSync(agentsRoot, { recursive: true });
  fs.mkdirSync(commandsRoot, { recursive: true });

  const previousManifest = readManifestIfPresent(manifestPath);
  const previousDestinations = new Set((previousManifest?.published_skill_entries ?? []).map((entry) => entry.destination_path));
  const nextDestinations = new Set<string>();
  const publishedEntries: ClaudePublishedEntry[] = [];
  const publishedSkillNames: string[] = [];

  for (const skill of repoSkills) {
    const metadata = readClaudeSkillMetadata(path.join(resolvedRoot, "logics", "skills", skill.name), skill.name);
    const agentPath = path.join(agentsRoot, `${skill.name}.md`);
    const commandPath = path.join(commandsRoot, `${skill.name}.md`);
    fs.writeFileSync(agentPath, renderClaudeAgent(metadata), "utf8");
    fs.writeFileSync(commandPath, renderClaudeCommand(metadata), "utf8");
    nextDestinations.add(agentPath);
    nextDestinations.add(commandPath);
    publishedSkillNames.push(skill.name);
    publishedEntries.push({
      name: skill.name,
      kind: "agent",
      source_path: metadata.skillRoot,
      destination_path: agentPath,
      mode: "copy",
      source_mtime_ns: readSkillMtime(metadata.skillRoot) ?? undefined
    });
    publishedEntries.push({
      name: skill.name,
      kind: "command",
      source_path: metadata.skillRoot,
      destination_path: commandPath,
      mode: "copy",
      source_mtime_ns: readSkillMtime(metadata.skillRoot) ?? undefined
    });
  }

  for (const destinationPath of previousDestinations) {
    if (!nextDestinations.has(destinationPath)) {
      removePath(destinationPath);
    }
  }

  const manifest: ClaudeGlobalKitManifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    manifest_kind: MANIFEST_KIND,
    installed_version: readRepoKitVersion(resolvedRoot),
    source_repo: resolvedRoot,
    source_revision: readGitRevision(path.join(resolvedRoot, "logics", "skills")),
    published_at: new Date().toISOString(),
    publication_mode: "copy",
    published_skill_entries: publishedEntries
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return {
    publicationMode: "copy",
    manifestPath,
    installedVersion: manifest.installed_version,
    sourceRevision: manifest.source_revision,
    publishedSkillNames: publishedSkillNames.sort()
  };
}

function getGlobalClaudeHome(): string {
  return path.resolve(process.env.LOGICS_CLAUDE_GLOBAL_HOME || path.join(os.homedir(), ".claude"));
}

function discoverRepoSkills(root: string, options?: { includeOptional?: boolean }): Array<{ name: string; tier: SkillTier }> {
  const skillsRoot = path.join(root, "logics", "skills");
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }
  const includeOptional = Boolean(options?.includeOptional);
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .filter((entry) => fs.existsSync(path.join(skillsRoot, entry.name, "SKILL.md")))
    .map((entry) => ({
      name: entry.name,
      tier: readSkillTier(path.join(skillsRoot, entry.name))
    }))
    .filter((entry) => includeOptional || entry.tier === "core")
    .sort((left, right) => left.name.localeCompare(right.name));
}

function discoverRepoSkillNames(root: string): string[] {
  return discoverRepoSkills(root, { includeOptional: true }).map((entry) => entry.name);
}

function readSkillTier(skillRoot: string): SkillTier {
  const agentYamlPath = path.join(skillRoot, "agents", "openai.yaml");
  if (!fs.existsSync(agentYamlPath) || !fs.statSync(agentYamlPath).isFile()) {
    return "core";
  }
  try {
    const document = parseDocument(fs.readFileSync(agentYamlPath, "utf8"), { prettyErrors: false });
    const parsed = document.toJSON();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "core";
    }
    return (parsed as Record<string, unknown>).tier === "optional" ? "optional" : "core";
  } catch {
    return "core";
  }
}

function readRepoKitVersion(root: string): string | undefined {
  const versionPath = path.join(root, "logics", "skills", "VERSION");
  if (!fs.existsSync(versionPath)) {
    return undefined;
  }
  const value = fs.readFileSync(versionPath, "utf8").trim();
  return value || undefined;
}

function readGitRevision(repoPath: string): string | undefined {
  const gitPath = path.join(repoPath, ".git");
  if (!fs.existsSync(gitPath)) {
    return undefined;
  }
  let actualGitDir = gitPath;
  const gitStat = fs.lstatSync(gitPath);
  if (gitStat.isFile()) {
    const pointer = fs.readFileSync(gitPath, "utf8").trim();
    const match = pointer.match(/^gitdir:\s*(.+)\s*$/i);
    if (!match) {
      return undefined;
    }
    actualGitDir = path.resolve(repoPath, match[1]);
  }
  const headPath = path.join(actualGitDir, "HEAD");
  if (!fs.existsSync(headPath)) {
    return undefined;
  }
  const head = fs.readFileSync(headPath, "utf8").trim();
  if (/^[0-9a-f]{40}$/i.test(head)) {
    return head;
  }
  const refMatch = head.match(/^ref:\s*(.+)\s*$/i);
  if (!refMatch) {
    return undefined;
  }
  const refPath = path.join(actualGitDir, refMatch[1]);
  if (fs.existsSync(refPath)) {
    return fs.readFileSync(refPath, "utf8").trim() || undefined;
  }
  return undefined;
}

function compareVersions(left?: string, right?: string): number {
  if (!left && !right) return 0;
  if (left && !right) return 1;
  if (!left && right) return -1;
  const leftParts = String(left).split(".").map((value) => Number.parseInt(value, 10));
  const rightParts = String(right).split(".").map((value) => Number.parseInt(value, 10));
  const max = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

function readManifestIfPresent(manifestPath: string): ClaudeGlobalKitManifest | null {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ClaudeGlobalKitManifest;
  } catch {
    return null;
  }
}

function removePath(target: string): void {
  if (!fs.existsSync(target)) {
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function readSkillMtime(skillRoot: string): number | null {
  const markers = [path.join(skillRoot, "SKILL.md"), path.join(skillRoot, "agents", "openai.yaml")];
  const mtimes = markers.filter((candidate) => fs.existsSync(candidate)).map((candidate) => fs.statSync(candidate).mtimeMs);
  if (mtimes.length === 0) {
    return null;
  }
  return Math.trunc(Math.max(...mtimes) * 1_000_000);
}

type ClaudeSkillMetadata = {
  skillRoot: string;
  skillName: string;
  displayName: string;
  defaultPrompt: string;
  shortDescription: string;
};

function readClaudeSkillMetadata(skillRoot: string, skillName: string): ClaudeSkillMetadata {
  const agentYamlPath = path.join(skillRoot, "agents", "openai.yaml");
  let displayName = skillName;
  let defaultPrompt = `Use $${skillName} for this repository.`;
  let shortDescription = "Repository-local Logics skill.";

  if (fs.existsSync(agentYamlPath)) {
    try {
      const document = parseDocument(fs.readFileSync(agentYamlPath, "utf8"), { prettyErrors: false });
      const parsed = document.toJSON();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const interfaceConfig = (parsed as { interface?: Record<string, unknown> }).interface;
        if (interfaceConfig && typeof interfaceConfig === "object") {
          if (typeof interfaceConfig.display_name === "string" && interfaceConfig.display_name.trim()) {
            displayName = interfaceConfig.display_name.trim();
          }
          if (typeof interfaceConfig.default_prompt === "string" && interfaceConfig.default_prompt.trim()) {
            defaultPrompt = interfaceConfig.default_prompt.trim();
          }
          if (typeof interfaceConfig.short_description === "string" && interfaceConfig.short_description.trim()) {
            shortDescription = interfaceConfig.short_description.trim();
          }
        }
      }
    } catch {
      // keep defaults
    }
  }

  return {
    skillRoot,
    skillName,
    displayName,
    defaultPrompt,
    shortDescription
  };
}

function renderClaudeCommand(metadata: ClaudeSkillMetadata): string {
  return [
    `# ${metadata.displayName}`,
    "",
    metadata.shortDescription,
    "",
    "Primary prompt:",
    metadata.defaultPrompt,
    "",
    "References:",
    `- \`${path.join(metadata.skillRoot, "SKILL.md")}\``,
    `- \`${path.join(metadata.skillRoot, "agents", "openai.yaml")}\``,
    ""
  ].join("\n");
}

function renderClaudeAgent(metadata: ClaudeSkillMetadata): string {
  return [
    `# ${metadata.displayName} Agent`,
    "",
    metadata.shortDescription,
    "",
    "Default prompt:",
    metadata.defaultPrompt,
    "",
    "References:",
    `- \`${path.join(metadata.skillRoot, "SKILL.md")}\``,
    `- \`${path.join(metadata.skillRoot, "agents", "openai.yaml")}\``,
    ""
  ].join("\n");
}
