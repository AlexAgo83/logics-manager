import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  buildRepoKitSource,
  compareVersions,
  existsOrSymlink,
  inspectPublicationLifecycle,
  publishSkill,
  readSkillMtime,
  removePath,
  runPublicationLifecycle
} from "./logicsGlobalKitLifecycle";

export type CodexOverlayStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "warning" | "healthy";

type PublishedSkillEntry = {
  name: string;
  tier: "core" | "optional";
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
  const base: CodexOverlaySnapshot = {
    status: "healthy",
    summary: "Global Codex Logics kit is ready.",
    issues: [],
    warnings: [],
    codexHome: globalHome,
    overlayRoot: skillsRoot,
    runCommand: buildCodexOverlayRunCommand()
  };

  const inspection = inspectPublicationLifecycle<GlobalKitManifest, PublishedSkillEntry>({
    root: resolvedRoot,
    manifestPath,
    validateManifest: (manifest) =>
      (manifest.manifest_kind && manifest.manifest_kind !== MANIFEST_KIND) ||
      (manifest.schema_version && manifest.schema_version !== MANIFEST_SCHEMA_VERSION)
        ? ["Global Logics kit manifest schema is unsupported."]
        : [],
    validateEntries: (entries) => {
      const issues: string[] = [];
      for (const entry of entries) {
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
      return issues;
    },
    publishedSkillNames: (entries) => entries.map((entry) => entry.name).sort(),
    versionChangeSeverity: "warning",
    versionChangeMessage: (repoVersion, installedVersion) =>
      `Repo-local kit version ${repoVersion} is newer than the published global version ${installedVersion || "unknown"}.`,
    revisionChangeSeverity: "warning",
    revisionChangeMessage: () => "Repo-local kit revision differs from the published revision for this repository.",
    missingVersionSeverity: "issue",
    missingVersionMessage: "Published global kit version is missing from the manifest."
  });

  if (inspection.kind === "missing-manager") {
    return {
      ...base,
      status: "missing-manager",
      summary: "This repository does not expose a compatible repo-local Logics kit source for global publication.",
      issues: inspection.issues
    };
  }

  if (inspection.kind === "missing-overlay") {
    return {
      ...base,
      status: "missing-overlay",
      summary: "No global Codex Logics kit is published yet. Opening this repository can publish it automatically.",
      issues: inspection.issues,
      installedVersion: inspection.context.repoVersion,
      sourceRepo: inspection.context.resolvedRoot,
      sourceRevision: inspection.context.repoRevision,
      publishedSkillNames: [],
      needsPublish: true
    };
  }

  if (inspection.kind === "stale") {
    return {
      ...base,
      status: "stale",
      summary: "Global Logics kit manifest is unreadable. Re-publish the global kit to recover deterministic state.",
      issues: inspection.issues,
      needsPublish: true
    };
  }

  const status: CodexOverlayStatus =
    inspection.issues.length > 0 ? "stale" : inspection.warnings.length > 0 ? "warning" : "healthy";
  const summary =
    status === "healthy"
      ? `Global Codex Logics kit is ready (${inspection.installedVersion || "unknown version"}). Launch Codex normally to use it.`
      : status === "warning"
        ? "Global Codex Logics kit is usable, but a newer or different repo-local source is available."
        : "Global Codex Logics kit needs repair or re-publication before it is reliable.";

  return {
    ...base,
    status,
    summary,
    issues: inspection.issues,
    warnings: inspection.warnings,
    publicationMode: inspection.publicationMode,
    installedVersion: inspection.installedVersion,
    sourceRepo: inspection.sourceRepo,
    sourceRevision: inspection.sourceRevision,
    publishedAt: inspection.publishedAt,
    publishedSkillNames: inspection.publishedSkillNames,
    needsPublish: status !== "healthy"
  };
}

export function publishCodexWorkspaceOverlay(root: string, options?: { includeOptional?: boolean }): CodexGlobalPublishResult {
  const resolvedRoot = path.resolve(root);
  const globalHome = getGlobalCodexHome();
  const globalSkillsRoot = path.join(globalHome, "skills");
  const manifestPath = path.join(globalHome, MANIFEST_NAME);
  const includeOptional = Boolean(options?.includeOptional);

  return runPublicationLifecycle<GlobalKitManifest, PublishedSkillEntry, CodexGlobalPublishResult>({
    root: resolvedRoot,
    manifestPath,
    prepareDestinations: () => {
      fs.mkdirSync(globalSkillsRoot, { recursive: true });
    },
    buildPublication: (context, previousManifest) => {
      const publishedRepoSkills = context.repoSkills.filter((entry) => includeOptional || entry.tier === "core");
      const previousPublishedNames = new Set((previousManifest?.published_skill_entries ?? []).map((entry) => entry.name));
      let publicationMode: "symlink" | "copy" = "symlink";
      const publishedEntries: PublishedSkillEntry[] = [];
      const publishedSkillNames = publishedRepoSkills.map((entry) => entry.name);

      for (const skill of publishedRepoSkills) {
        const destinationPath = path.join(globalSkillsRoot, skill.name);
        removePath(destinationPath);
        const mode = publishSkill(skill.root, destinationPath);
        if (mode === "copy") {
          publicationMode = "copy";
        }
        publishedEntries.push({
          name: skill.name,
          tier: skill.tier,
          source_path: skill.root,
          destination_path: destinationPath,
          mode,
          source_mtime_ns: readSkillMtime(skill.root) ?? undefined
        });
      }

      for (const previousName of previousPublishedNames) {
        if (!publishedSkillNames.includes(previousName)) {
          removePath(path.join(globalSkillsRoot, previousName));
        }
      }

      return {
        publishedEntries,
        publishedSkillNames,
        publicationMode
      };
    },
    buildManifest: (context, publication) => ({
      schema_version: MANIFEST_SCHEMA_VERSION,
      manifest_kind: MANIFEST_KIND,
      installed_version: context.repoVersion,
      source_repo: context.resolvedRoot,
      source_revision: context.repoRevision,
      published_at: new Date().toISOString(),
      publication_mode: publication.publicationMode as "symlink" | "copy",
      include_optional: includeOptional,
      published_skill_entries: publication.publishedEntries
    }),
    formatResult: (currentManifestPath, manifest, publication) => ({
      publicationMode: publication.publicationMode as "symlink" | "copy",
      manifestPath: currentManifestPath,
      installedVersion: manifest.installed_version,
      sourceRevision: manifest.source_revision,
      publishedSkillNames: publication.publishedSkillNames,
      includeOptional
    })
  });
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
  const source = buildRepoKitSource(resolvedRoot);
  if (compareVersions(source.repoVersion, current.installedVersion) > 0) {
    return true;
  }
  if (
    source.repoVersion &&
    current.installedVersion &&
    compareVersions(source.repoVersion, current.installedVersion) === 0 &&
    source.repoRevision &&
    current.sourceRevision &&
    source.repoRevision !== current.sourceRevision &&
    current.sourceRepo === resolvedRoot
  ) {
    return true;
  }
  return false;
}

function getGlobalCodexHome(): string {
  return path.resolve(process.env.LOGICS_CODEX_GLOBAL_HOME || path.join(os.homedir(), ".codex"));
}
