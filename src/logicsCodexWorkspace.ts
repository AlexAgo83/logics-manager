import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseDocument } from "yaml";

export type CodexOverlayStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "warning" | "healthy";
type SkillTier = "core" | "optional";

type PublishedSkillEntry = {
  name: string;
  tier: SkillTier;
  source_path: string;
  destination_path: string;
  mode: "symlink" | "copy";
  source_mtime_ns?: number;
};

type GlobalKitManifest = {
  schema_version?: number;
  manifest_kind?: string;
  installed_version?: string;
  source_repo?: string;
  source_revision?: string;
  published_at?: string;
  publication_mode?: "symlink" | "copy";
  include_optional?: boolean;
  published_skill_entries?: PublishedSkillEntry[];
};

export type CodexOverlaySnapshot = {
  status: CodexOverlayStatus;
  summary: string;
  issues: string[];
  warnings: string[];
  workspaceId?: string;
  overlayRoot?: string;
  codexHome?: string;
  publicationMode?: string;
  managerScriptPath?: string;
  syncCommand?: string;
  runCommand?: string;
  installedVersion?: string;
  sourceRepo?: string;
  sourceRevision?: string;
  publishedAt?: string;
  publishedSkillNames?: string[];
  needsPublish?: boolean;
};

export type CodexGlobalPublishResult = {
  publicationMode: "symlink" | "copy";
  manifestPath: string;
  installedVersion?: string;
  sourceRevision?: string;
  publishedSkillNames: string[];
  includeOptional: boolean;
};

const MANIFEST_NAME = "logics-global-kit.json";
const MANIFEST_SCHEMA_VERSION = 1;
const MANIFEST_KIND = "logics-global-kit";

export function buildCodexOverlaySyncCommand(): string {
  return "Logics plugin auto-publishes the global Codex kit for compatible repositories.";
}

export function buildCodexOverlayRunCommand(): string {
  return "codex";
}

export function inspectCodexWorkspaceOverlay(root: string | null): CodexOverlaySnapshot {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Select a project root before checking the global Codex Logics kit state.",
      issues: [],
      warnings: []
    };
  }

  const resolvedRoot = path.resolve(root);
  const globalHome = getGlobalCodexHome();
  const skillsRoot = path.join(globalHome, "skills");
  const manifestPath = path.join(globalHome, MANIFEST_NAME);
  const repoSkillsRoot = path.join(resolvedRoot, "logics", "skills");
  const repoSkillNames = discoverRepoSkillNames(resolvedRoot);
  const repoVersion = readRepoKitVersion(resolvedRoot);
  const repoRevision = readGitRevision(repoSkillsRoot);
  const base: CodexOverlaySnapshot = {
    status: "healthy",
    summary: "Global Codex Logics kit is ready.",
    issues: [],
    warnings: [],
    codexHome: globalHome,
    overlayRoot: skillsRoot,
    runCommand: buildCodexOverlayRunCommand()
  };

  if (repoSkillNames.length === 0) {
    return {
      ...base,
      status: "missing-manager",
      summary: "This repository does not expose a compatible repo-local Logics kit source for global publication.",
      issues: ["No repo-local Logics skills were found under logics/skills."]
    };
  }

  if (!fs.existsSync(manifestPath)) {
    return {
      ...base,
      status: "missing-overlay",
      summary: "No global Codex Logics kit is published yet. Opening this repository can publish it automatically.",
      issues: ["Global Logics kit manifest is missing."],
      installedVersion: repoVersion,
      sourceRepo: resolvedRoot,
      sourceRevision: repoRevision,
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  let manifest: GlobalKitManifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as GlobalKitManifest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      status: "stale",
      summary: "Global Logics kit manifest is unreadable. Re-publish the global kit to recover deterministic state.",
      issues: [`Global kit manifest is unreadable: ${message}`],
      needsPublish: true
    };
  }

  const issues: string[] = [];
  const warnings: string[] = [];
  const publishedEntries = manifest.published_skill_entries ?? [];
  const publishedSkillNames = publishedEntries.map((entry) => entry.name).sort();

  if ((manifest.manifest_kind && manifest.manifest_kind !== MANIFEST_KIND) || (manifest.schema_version && manifest.schema_version !== MANIFEST_SCHEMA_VERSION)) {
    issues.push("Global Logics kit manifest schema is unsupported.");
  }

  for (const entry of publishedEntries) {
    if (!fs.existsSync(entry.source_path)) {
      issues.push(`Published skill source is missing for \`${entry.name}\`.`);
      continue;
    }
    if (!existsOrSymlink(entry.destination_path)) {
      issues.push(`Published skill destination is missing for \`${entry.name}\`.`);
      continue;
    }
    if (entry.mode === "copy") {
      const currentSourceMtime = readSkillMtime(entry.source_path);
      if (
        typeof entry.source_mtime_ns === "number" &&
        typeof currentSourceMtime === "number" &&
        entry.source_mtime_ns !== currentSourceMtime
      ) {
        issues.push(`Published copied skill is stale for \`${entry.name}\`.`);
      }
    }
  }

  const installedVersion = manifest.installed_version;
  const sourceRepo = manifest.source_repo ? path.resolve(manifest.source_repo) : undefined;
  const sourceRevision = manifest.source_revision;
  const versionComparison = compareVersions(repoVersion, installedVersion);
  if (versionComparison > 0) {
    warnings.push(`Repo-local kit version ${repoVersion} is newer than the published global version ${installedVersion || "unknown"}.`);
  } else if (versionComparison === 0 && repoRevision && sourceRevision && repoRevision !== sourceRevision && sourceRepo === resolvedRoot) {
    warnings.push("Repo-local kit revision differs from the published revision for this repository.");
  }

  if (!installedVersion) {
    issues.push("Published global kit version is missing from the manifest.");
  }

  const status: CodexOverlayStatus = issues.length > 0 ? "stale" : warnings.length > 0 ? "warning" : "healthy";
  const summary =
    status === "healthy"
      ? `Global Codex Logics kit is ready (${installedVersion || "unknown version"}). Launch Codex normally to use it.`
      : status === "warning"
        ? "Global Codex Logics kit is usable, but a newer or different repo-local source is available."
        : "Global Codex Logics kit needs repair or re-publication before it is reliable.";

  return {
    ...base,
    status,
    summary,
    issues,
    warnings,
    publicationMode: manifest.publication_mode,
    installedVersion,
    sourceRepo,
    sourceRevision,
    publishedAt: manifest.published_at,
    publishedSkillNames,
    needsPublish: status !== "healthy"
  };
}

export function publishCodexWorkspaceOverlay(root: string, options?: { includeOptional?: boolean }): CodexGlobalPublishResult {
  const resolvedRoot = path.resolve(root);
  const repoSkillsRoot = path.join(resolvedRoot, "logics", "skills");
  const allRepoSkills = discoverRepoSkills(resolvedRoot, { includeOptional: true });
  if (allRepoSkills.length === 0) {
    throw new Error("No repo-local Logics skills found under logics/skills.");
  }
  const includeOptional = Boolean(options?.includeOptional);
  const publishedRepoSkills = discoverRepoSkills(resolvedRoot, { includeOptional });
  const repoSkillNames = publishedRepoSkills.map((entry) => entry.name);

  const globalHome = getGlobalCodexHome();
  const globalSkillsRoot = path.join(globalHome, "skills");
  const manifestPath = path.join(globalHome, MANIFEST_NAME);
  fs.mkdirSync(globalSkillsRoot, { recursive: true });

  const previousManifest = readManifestIfPresent(manifestPath);
  const previousPublishedNames = new Set((previousManifest?.published_skill_entries ?? []).map((entry) => entry.name));

  let publicationMode: "symlink" | "copy" = "symlink";
  const publishedEntries: PublishedSkillEntry[] = [];

  for (const skill of publishedRepoSkills) {
    const sourcePath = path.join(repoSkillsRoot, skill.name);
    const destinationPath = path.join(globalSkillsRoot, skill.name);
    removePath(destinationPath);
    const mode = publishSkill(sourcePath, destinationPath);
    if (mode === "copy") {
      publicationMode = "copy";
    }
    publishedEntries.push({
      name: skill.name,
      tier: skill.tier,
      source_path: sourcePath,
      destination_path: destinationPath,
      mode,
      source_mtime_ns: readSkillMtime(sourcePath) ?? undefined
    });
  }

  for (const previousName of previousPublishedNames) {
    if (!repoSkillNames.includes(previousName)) {
      removePath(path.join(globalSkillsRoot, previousName));
    }
  }

  const manifest: GlobalKitManifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    manifest_kind: MANIFEST_KIND,
    installed_version: readRepoKitVersion(resolvedRoot),
    source_repo: resolvedRoot,
    source_revision: readGitRevision(repoSkillsRoot),
    published_at: new Date().toISOString(),
    publication_mode: publicationMode,
    include_optional: includeOptional,
    published_skill_entries: publishedEntries
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  return {
    publicationMode,
    manifestPath,
    installedVersion: manifest.installed_version,
    sourceRevision: manifest.source_revision,
    publishedSkillNames: repoSkillNames,
    includeOptional
  };
}

export function shouldPublishRepoKit(root: string, snapshot?: CodexOverlaySnapshot): boolean {
  const resolvedRoot = path.resolve(root);
  const current = snapshot ?? inspectCodexWorkspaceOverlay(resolvedRoot);
  if (current.status === "missing-manager") {
    return false;
  }
  if (current.status === "missing-overlay" || current.status === "stale") {
    return true;
  }
  const repoVersion = readRepoKitVersion(resolvedRoot);
  if (compareVersions(repoVersion, current.installedVersion) > 0) {
    return true;
  }
  const repoRevision = readGitRevision(path.join(resolvedRoot, "logics", "skills"));
  if (
    repoVersion &&
    current.installedVersion &&
    compareVersions(repoVersion, current.installedVersion) === 0 &&
    repoRevision &&
    current.sourceRevision &&
    repoRevision !== current.sourceRevision &&
    current.sourceRepo === resolvedRoot
  ) {
    return true;
  }
  return false;
}

function getGlobalCodexHome(): string {
  return path.resolve(process.env.LOGICS_CODEX_GLOBAL_HOME || path.join(os.homedir(), ".codex"));
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
  const packedRefsPath = path.join(actualGitDir, "packed-refs");
  if (!fs.existsSync(packedRefsPath)) {
    return undefined;
  }
  const packedRefs = fs.readFileSync(packedRefsPath, "utf8").split(/\r?\n/);
  const line = packedRefs.find((entry) => entry.endsWith(` ${refMatch[1]}`));
  if (!line) {
    return undefined;
  }
  const [revision] = line.split(" ");
  return revision || undefined;
}

function compareVersions(left?: string, right?: string): number {
  if (!left && !right) {
    return 0;
  }
  if (left && !right) {
    return 1;
  }
  if (!left && right) {
    return -1;
  }
  const leftParts = String(left)
    .split(".")
    .map((value) => Number.parseInt(value, 10));
  const rightParts = String(right)
    .split(".")
    .map((value) => Number.parseInt(value, 10));
  const max = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }
  return 0;
}

function readManifestIfPresent(manifestPath: string): GlobalKitManifest | null {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as GlobalKitManifest;
  } catch {
    return null;
  }
}

function publishSkill(sourcePath: string, destinationPath: string): "symlink" | "copy" {
  try {
    fs.symlinkSync(sourcePath, destinationPath, "dir");
    return "symlink";
  } catch {
    copyDirectory(sourcePath, destinationPath);
    return "copy";
  }
}

function copyDirectory(sourcePath: string, destinationPath: string): void {
  fs.mkdirSync(destinationPath, { recursive: true });
  for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
    const sourceEntry = path.join(sourcePath, entry.name);
    const destinationEntry = path.join(destinationPath, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourceEntry, destinationEntry);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(sourceEntry);
      fs.symlinkSync(linkTarget, destinationEntry);
    } else {
      fs.copyFileSync(sourceEntry, destinationEntry);
    }
  }
}

function removePath(target: string): void {
  if (!fs.existsSync(target) && !existsOrSymlink(target)) {
    return;
  }
  try {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || stat.isFile()) {
      fs.unlinkSync(target);
      return;
    }
  } catch {
    return;
  }
  fs.rmSync(target, { recursive: true, force: true });
}

function existsOrSymlink(target: string): boolean {
  if (fs.existsSync(target)) {
    return true;
  }
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

function readSkillMtime(target: string): number | null {
  const marker = path.join(target, "SKILL.md");
  if (fs.existsSync(marker)) {
    return Math.trunc(fs.statSync(marker).mtimeMs * 1_000_000);
  }
  if (fs.existsSync(target)) {
    return Math.trunc(fs.statSync(target).mtimeMs * 1_000_000);
  }
  return null;
}

function readSkillTier(skillRoot: string): SkillTier {
  const agentYamlPath = path.join(skillRoot, "agents", "openai.yaml");
  if (!fs.existsSync(agentYamlPath) || !fs.statSync(agentYamlPath).isFile()) {
    return "core";
  }
  try {
    const document = parseDocument(fs.readFileSync(agentYamlPath, "utf8"), { prettyErrors: false });
    if (Array.isArray(document.errors) && document.errors.length > 0) {
      return "core";
    }
    const parsed = document.toJSON();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return "core";
    }
    return (parsed as Record<string, unknown>).tier === "optional" ? "optional" : "core";
  } catch {
    return "core";
  }
}
