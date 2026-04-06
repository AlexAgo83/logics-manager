import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";

export type SkillTier = "core" | "optional";

export type RepoSkill = {
  name: string;
  tier: SkillTier;
  root: string;
};

export type RepoKitSource = {
  resolvedRoot: string;
  repoSkillsRoot: string;
  repoSkills: RepoSkill[];
  repoSkillNames: string[];
  repoVersion?: string;
  repoRevision?: string;
};

type CommonManifest<TEntry> = {
  installed_version?: string;
  source_repo?: string;
  source_revision?: string;
  published_at?: string;
  publication_mode?: string;
  published_skill_entries?: TEntry[];
};

type Severity = "warning" | "issue";

export type PublicationInspection<TManifest extends CommonManifest<TEntry>, TEntry> =
  | {
      kind: "missing-manager";
      context: RepoKitSource;
      issues: string[];
      warnings: string[];
      publishedSkillNames: string[];
      needsPublish: false;
    }
  | {
      kind: "missing-overlay";
      context: RepoKitSource;
      issues: string[];
      warnings: string[];
      publishedSkillNames: string[];
      needsPublish: true;
    }
  | {
      kind: "stale";
      context: RepoKitSource;
      issues: string[];
      warnings: string[];
      publishedSkillNames: string[];
      needsPublish: true;
    }
  | {
      kind: "present";
      context: RepoKitSource;
      manifest: TManifest;
      issues: string[];
      warnings: string[];
      publishedSkillNames: string[];
      installedVersion?: string;
      sourceRepo?: string;
      sourceRevision?: string;
      publishedAt?: string;
      publicationMode?: string;
      needsPublish: boolean;
    };

export type PublicationResult<TEntry> = {
  publishedEntries: TEntry[];
  publishedSkillNames: string[];
  publicationMode: string;
};

export function buildRepoKitSource(root: string): RepoKitSource {
  const resolvedRoot = path.resolve(root);
  const repoSkillsRoot = path.join(resolvedRoot, "logics", "skills");
  const repoSkills = discoverRepoSkills(resolvedRoot, { includeOptional: true });
  return {
    resolvedRoot,
    repoSkillsRoot,
    repoSkills,
    repoSkillNames: repoSkills.map((entry) => entry.name),
    repoVersion: readRepoKitVersion(resolvedRoot),
    repoRevision: readGitRevision(repoSkillsRoot)
  };
}

export function inspectPublicationLifecycle<TManifest extends CommonManifest<TEntry>, TEntry>(options: {
  root: string;
  manifestPath: string;
  validateManifest: (manifest: TManifest) => string[];
  validateEntries: (entries: TEntry[], context: RepoKitSource) => string[];
  publishedSkillNames: (entries: TEntry[]) => string[];
  versionChangeSeverity: Severity;
  versionChangeMessage: (repoVersion?: string, installedVersion?: string) => string;
  revisionChangeSeverity: Severity;
  revisionChangeMessage: () => string;
  missingVersionSeverity: Severity;
  missingVersionMessage: string;
}): PublicationInspection<TManifest, TEntry> {
  const context = buildRepoKitSource(options.root);
  if (context.repoSkillNames.length === 0) {
    return {
      kind: "missing-manager",
      context,
      issues: ["No repo-local Logics skills were found under logics/skills."],
      warnings: [],
      publishedSkillNames: [],
      needsPublish: false
    };
  }

  if (!fs.existsSync(options.manifestPath)) {
    return {
      kind: "missing-overlay",
      context,
      issues: ["Global Logics kit manifest is missing."],
      warnings: [],
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  const manifest = readJsonManifestIfPresent<TManifest>(options.manifestPath);
  if (!manifest) {
    return {
      kind: "stale",
      context,
      issues: ["Global Logics kit manifest is unreadable."],
      warnings: [],
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  const entries = Array.isArray(manifest.published_skill_entries) ? manifest.published_skill_entries : [];
  const publishedSkillNames = options.publishedSkillNames(entries);
  const issues = [...options.validateManifest(manifest), ...options.validateEntries(entries, context)];
  const warnings: string[] = [];
  const installedVersion = manifest.installed_version;
  const sourceRepo = manifest.source_repo ? path.resolve(manifest.source_repo) : undefined;
  const sourceRevision = manifest.source_revision;

  if (!installedVersion) {
    (options.missingVersionSeverity === "issue" ? issues : warnings).push(options.missingVersionMessage);
  }

  if (compareVersions(context.repoVersion, installedVersion) > 0) {
    (options.versionChangeSeverity === "issue" ? issues : warnings).push(
      options.versionChangeMessage(context.repoVersion, installedVersion)
    );
  }

  if (
    context.repoRevision &&
    sourceRevision &&
    context.repoRevision !== sourceRevision &&
    sourceRepo === context.resolvedRoot
  ) {
    (options.revisionChangeSeverity === "issue" ? issues : warnings).push(options.revisionChangeMessage());
  }

  return {
    kind: "present",
    context,
    manifest,
    issues,
    warnings,
    publishedSkillNames,
    installedVersion,
    sourceRepo,
    sourceRevision,
    publishedAt: manifest.published_at,
    publicationMode: manifest.publication_mode,
    needsPublish: issues.length > 0 || warnings.length > 0
  };
}

export function runPublicationLifecycle<TManifest extends CommonManifest<TEntry>, TEntry, TResult>(options: {
  root: string;
  manifestPath: string;
  prepareDestinations: () => void;
  buildPublication: (context: RepoKitSource, previousManifest: TManifest | null) => PublicationResult<TEntry>;
  buildManifest: (context: RepoKitSource, publication: PublicationResult<TEntry>) => TManifest;
  formatResult: (manifestPath: string, manifest: TManifest, publication: PublicationResult<TEntry>) => TResult;
}): TResult {
  const context = buildRepoKitSource(options.root);
  if (context.repoSkillNames.length === 0) {
    throw new Error("No repo-local Logics skills found under logics/skills.");
  }

  options.prepareDestinations();
  const previousManifest = readJsonManifestIfPresent<TManifest>(options.manifestPath);
  const publication = options.buildPublication(context, previousManifest);
  const manifest = options.buildManifest(context, publication);
  fs.writeFileSync(options.manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return options.formatResult(options.manifestPath, manifest, publication);
}

export function discoverRepoSkills(root: string, options?: { includeOptional?: boolean }): RepoSkill[] {
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
    .map((entry) => {
      const skillRoot = path.join(skillsRoot, entry.name);
      return {
        name: entry.name,
        tier: readSkillTier(skillRoot),
        root: skillRoot
      };
    })
    .filter((entry) => includeOptional || entry.tier === "core")
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function readRepoKitVersion(root: string): string | undefined {
  const versionPath = path.join(root, "logics", "skills", "VERSION");
  if (!fs.existsSync(versionPath)) {
    return undefined;
  }
  const value = fs.readFileSync(versionPath, "utf8").trim();
  return value || undefined;
}

export function readGitRevision(repoPath: string): string | undefined {
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

export function compareVersions(left?: string, right?: string): number {
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

export function readJsonManifestIfPresent<T>(manifestPath: string): T | null {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function publishSkill(sourcePath: string, destinationPath: string): "symlink" | "copy" {
  try {
    fs.symlinkSync(sourcePath, destinationPath, "dir");
    return "symlink";
  } catch {
    copyDirectory(sourcePath, destinationPath);
    return "copy";
  }
}

export function removePath(target: string): void {
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

export function existsOrSymlink(target: string): boolean {
  if (fs.existsSync(target)) {
    return true;
  }
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

export function readSkillMtime(target: string, markers: string[] = ["SKILL.md"]): number | null {
  const mtimes = markers
    .map((candidate) => path.join(target, candidate))
    .filter((candidate) => fs.existsSync(candidate))
    .map((candidate) => fs.statSync(candidate).mtimeMs);
  if (mtimes.length > 0) {
    return Math.trunc(Math.max(...mtimes) * 1_000_000);
  }
  if (fs.existsSync(target)) {
    return Math.trunc(fs.statSync(target).mtimeMs * 1_000_000);
  }
  return null;
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
