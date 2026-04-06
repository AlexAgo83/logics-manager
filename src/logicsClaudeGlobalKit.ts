import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { parseDocument } from "yaml";
import {
  inspectPublicationLifecycle,
  readSkillMtime,
  removePath,
  runPublicationLifecycle
} from "./logicsGlobalKitLifecycle";

export type ClaudeKitStatus = "unavailable" | "missing-manager" | "missing-overlay" | "stale" | "healthy";

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
  const base: ClaudeKitSnapshot = {
    status: "healthy",
    summary: "Global Claude Logics kit is ready.",
    issues: [],
    warnings: [],
    claudeHome,
    agentsRoot,
    commandsRoot
  };

  const inspection = inspectPublicationLifecycle<ClaudeGlobalKitManifest, ClaudePublishedEntry>({
    root: resolvedRoot,
    manifestPath,
    validateManifest: (manifest) =>
      (manifest.manifest_kind && manifest.manifest_kind !== MANIFEST_KIND) ||
      (manifest.schema_version && manifest.schema_version !== MANIFEST_SCHEMA_VERSION)
        ? ["Global Claude kit manifest schema is unsupported."]
        : [],
    validateEntries: (entries) => {
      const issues: string[] = [];
      for (const entry of entries) {
        if (!fs.existsSync(entry.source_path)) {
          issues.push(`Published Claude kit source is missing for \`${entry.name}\` (${entry.kind}).`);
          continue;
        }
        if (!fs.existsSync(entry.destination_path)) {
          issues.push(`Published Claude kit destination is missing for \`${entry.name}\` (${entry.kind}).`);
          continue;
        }
        const currentSourceMtime = readSkillMtime(entry.source_path, ["SKILL.md", path.join("agents", "openai.yaml")]);
        if (
          typeof entry.source_mtime_ns === "number" &&
          typeof currentSourceMtime === "number" &&
          entry.source_mtime_ns !== currentSourceMtime
        ) {
          issues.push(`Published Claude kit entry is stale for \`${entry.name}\` (${entry.kind}).`);
        }
      }
      return issues;
    },
    publishedSkillNames: (entries) => Array.from(new Set(entries.map((entry) => entry.name))).sort(),
    versionChangeSeverity: "issue",
    versionChangeMessage: (repoVersion, installedVersion) =>
      `Repo-local kit version ${repoVersion} is newer than the published Claude version ${installedVersion || "unknown"}.`,
    revisionChangeSeverity: "issue",
    revisionChangeMessage: () => "Repo-local kit revision differs from the published Claude revision for this repository.",
    missingVersionSeverity: "issue",
    missingVersionMessage: "Published global Claude kit version is missing from the manifest."
  });

  if (inspection.kind === "missing-manager") {
    return {
      ...base,
      status: "missing-manager",
      summary: "This repository does not expose a compatible repo-local Logics kit source for Claude publication.",
      issues: inspection.issues
    };
  }

  if (inspection.kind === "missing-overlay") {
    return {
      ...base,
      status: "missing-overlay",
      summary: "No global Claude Logics kit is published yet.",
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
      summary: "Global Claude Logics kit manifest is unreadable.",
      issues: inspection.issues,
      needsPublish: true
    };
  }

  const status: ClaudeKitStatus = inspection.issues.length > 0 ? "stale" : "healthy";
  const summary =
    status === "healthy"
      ? `Global Claude Logics kit is ready (${inspection.installedVersion || "unknown version"}). Launch Claude normally to use it.`
      : "Global Claude Logics kit needs re-publication before it is reliable.";

  return {
    ...base,
    status,
    summary,
    issues: inspection.issues,
    warnings: inspection.warnings,
    installedVersion: inspection.installedVersion,
    sourceRepo: inspection.sourceRepo,
    sourceRevision: inspection.sourceRevision,
    publishedAt: inspection.publishedAt,
    publishedSkillNames: inspection.publishedSkillNames,
    needsPublish: status !== "healthy"
  };
}

export function publishClaudeGlobalKit(root: string): ClaudeGlobalPublishResult {
  const resolvedRoot = path.resolve(root);
  const claudeHome = getGlobalClaudeHome();
  const agentsRoot = path.join(claudeHome, "agents");
  const commandsRoot = path.join(claudeHome, "commands");
  const manifestPath = path.join(claudeHome, MANIFEST_NAME);

  return runPublicationLifecycle<ClaudeGlobalKitManifest, ClaudePublishedEntry, ClaudeGlobalPublishResult>({
    root: resolvedRoot,
    manifestPath,
    prepareDestinations: () => {
      fs.mkdirSync(agentsRoot, { recursive: true });
      fs.mkdirSync(commandsRoot, { recursive: true });
    },
    buildPublication: (context, previousManifest) => {
      const previousDestinations = new Set((previousManifest?.published_skill_entries ?? []).map((entry) => entry.destination_path));
      const nextDestinations = new Set<string>();
      const publishedEntries: ClaudePublishedEntry[] = [];
      const publishedSkillNames: string[] = [];

      for (const skill of context.repoSkills) {
        const metadata = readClaudeSkillMetadata(skill.root, skill.name);
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
          source_mtime_ns: readSkillMtime(metadata.skillRoot, ["SKILL.md", path.join("agents", "openai.yaml")]) ?? undefined
        });
        publishedEntries.push({
          name: skill.name,
          kind: "command",
          source_path: metadata.skillRoot,
          destination_path: commandPath,
          mode: "copy",
          source_mtime_ns: readSkillMtime(metadata.skillRoot, ["SKILL.md", path.join("agents", "openai.yaml")]) ?? undefined
        });
      }

      for (const destinationPath of previousDestinations) {
        if (!nextDestinations.has(destinationPath)) {
          removePath(destinationPath);
        }
      }

      return {
        publishedEntries,
        publishedSkillNames: publishedSkillNames.sort(),
        publicationMode: "copy"
      };
    },
    buildManifest: (context, publication) => ({
      schema_version: MANIFEST_SCHEMA_VERSION,
      manifest_kind: MANIFEST_KIND,
      installed_version: context.repoVersion,
      source_repo: context.resolvedRoot,
      source_revision: context.repoRevision,
      published_at: new Date().toISOString(),
      publication_mode: "copy",
      published_skill_entries: publication.publishedEntries
    }),
    formatResult: (currentManifestPath, manifest, publication) => ({
      publicationMode: "copy",
      manifestPath: currentManifestPath,
      installedVersion: manifest.installed_version,
      sourceRevision: manifest.source_revision,
      publishedSkillNames: publication.publishedSkillNames
    })
  });
}

function getGlobalClaudeHome(): string {
  return path.resolve(process.env.LOGICS_CLAUDE_GLOBAL_HOME || path.join(os.homedir(), ".claude"));
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
      // Keep defaults for malformed metadata during publication.
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
