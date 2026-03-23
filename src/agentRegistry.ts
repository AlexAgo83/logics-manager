import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";

export interface AgentDefinition {
  id: string;
  skillName: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string;
  preferredContextProfile: "tiny" | "normal" | "deep";
  allowedDocStages: string[];
  blockedDocStages: string[];
  responseStyle: "concise" | "balanced" | "detailed";
  sourcePath: string;
  relSourcePath: string;
}

export interface AgentValidationIssue {
  sourcePath: string;
  message: string;
}

export interface AgentRegistrySnapshot {
  agents: AgentDefinition[];
  issues: AgentValidationIssue[];
  scannedFiles: number;
}

type ParsedOpenAiInterface = {
  values: Record<string, unknown>;
  issues: AgentValidationIssue[];
};

export function createEmptyAgentRegistry(): AgentRegistrySnapshot {
  return {
    agents: [],
    issues: [],
    scannedFiles: 0
  };
}

export function extractExplicitAgentInvocation(input: string): string | null {
  const match = input.match(/\$logics-[a-z0-9][a-z0-9-]*/i);
  return match?.[0]?.toLowerCase() ?? null;
}

export function loadAgentRegistry(root: string): AgentRegistrySnapshot {
  const skillsRoot = path.join(root, "logics", "skills");
  if (!fs.existsSync(skillsRoot) || !fs.statSync(skillsRoot).isDirectory()) {
    return createEmptyAgentRegistry();
  }

  const issues: AgentValidationIssue[] = [];
  const candidates: AgentDefinition[] = [];
  let scannedFiles = 0;

  const skillEntries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  for (const entry of skillEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const skillName = entry.name;
    const sourcePath = path.join(skillsRoot, skillName, "agents", "openai.yaml");
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      continue;
    }

    scannedFiles += 1;
    const relSourcePath = path.relative(root, sourcePath).replace(/\\/g, "/");
    const fileIssues: AgentValidationIssue[] = [];
    const invocationId = deriveInvocationId(skillName);
    if (!invocationId) {
      fileIssues.push({
        sourcePath: relSourcePath,
        message: `Could not derive invocation id from skill folder: ${skillName}`
      });
    }

    if (invocationId && !invocationId.startsWith("$logics-")) {
      fileIssues.push({
        sourcePath: relSourcePath,
        message: `Derived invocation id must start with $logics- (got ${invocationId}).`
      });
    }

    let content = "";
    try {
      content = fs.readFileSync(sourcePath, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      fileIssues.push({
        sourcePath: relSourcePath,
        message: `Failed to read file: ${message}`
      });
    }

    const parsed = content ? parseOpenAiInterface(content, relSourcePath) : { values: {}, issues: [] };
    fileIssues.push(...parsed.issues);
    const displayName = expectRequiredString(parsed.values, "display_name", relSourcePath, fileIssues);
    const shortDescription = expectRequiredString(parsed.values, "short_description", relSourcePath, fileIssues);
    const defaultPrompt = expectRequiredString(parsed.values, "default_prompt", relSourcePath, fileIssues);
    const preferredContextProfile = parseOptionalEnum(
      parsed.values,
      "preferred_context_profile",
      ["tiny", "normal", "deep"],
      "normal",
      relSourcePath,
      fileIssues
    );
    const responseStyle = parseOptionalEnum(
      parsed.values,
      "response_style",
      ["concise", "balanced", "detailed"],
      "concise",
      relSourcePath,
      fileIssues
    );
    const allowedDocStages = parseOptionalStringArray(parsed.values, "allowed_doc_stages", relSourcePath, fileIssues);
    const blockedDocStages = parseOptionalStringArray(parsed.values, "blocked_doc_stages", relSourcePath, fileIssues);

    if (fileIssues.length > 0 || !invocationId || !displayName || !shortDescription || !defaultPrompt) {
      issues.push(...fileIssues);
      continue;
    }

    candidates.push({
      id: invocationId,
      skillName,
      displayName,
      shortDescription,
      defaultPrompt,
      preferredContextProfile,
      allowedDocStages,
      blockedDocStages,
      responseStyle,
      sourcePath,
      relSourcePath
    });
  }

  const duplicateIds = findDuplicateIds(candidates.map((candidate) => candidate.id));
  if (duplicateIds.size > 0) {
    for (const duplicateId of duplicateIds) {
      const duplicated = candidates.filter((candidate) => candidate.id === duplicateId);
      for (const entry of duplicated) {
        issues.push({
          sourcePath: entry.relSourcePath,
          message: `Duplicate invocation id detected: ${duplicateId}`
        });
      }
    }
  }

  const agents = candidates
    .filter((candidate) => !duplicateIds.has(candidate.id))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));

  return {
    agents,
    issues,
    scannedFiles
  };
}

function parseOpenAiInterface(content: string, sourcePath: string): ParsedOpenAiInterface {
  const issues: AgentValidationIssue[] = [];
  const values: Record<string, unknown> = {};

  let document;
  try {
    document = parseDocument(content, { prettyErrors: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push({
      sourcePath,
      message: `Invalid YAML: ${message}`
    });
    return { values, issues };
  }

  if (Array.isArray(document.errors) && document.errors.length > 0) {
    document.errors.forEach((error) => {
      issues.push({
        sourcePath,
        message: `Invalid YAML: ${error.message}`
      });
    });
    return { values, issues };
  }

  const parsed = document.toJSON();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    issues.push({
      sourcePath,
      message: "Expected a top-level YAML mapping."
    });
    return { values, issues };
  }

  const interfaceSection = (parsed as Record<string, unknown>).interface;
  if (!interfaceSection || typeof interfaceSection !== "object" || Array.isArray(interfaceSection)) {
    issues.push({
      sourcePath,
      message: "Missing top-level 'interface' section."
    });
    return { values, issues };
  }

  for (const [key, value] of Object.entries(interfaceSection)) {
    values[key] = value;
  }

  return { values, issues };
}

function expectRequiredString(
  values: Record<string, unknown>,
  key: string,
  sourcePath: string,
  issues: AgentValidationIssue[]
): string | null {
  const value = values[key];
  if (value === undefined) {
    issues.push({
      sourcePath,
      message: `Missing required field: interface.${key}`
    });
    return null;
  }
  if (typeof value !== "string") {
    issues.push({
      sourcePath,
      message: `Field interface.${key} must be a string.`
    });
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    issues.push({
      sourcePath,
      message: `Field interface.${key} cannot be empty.`
    });
    return null;
  }
  return normalized;
}

function deriveInvocationId(skillName: string): string | null {
  const normalized = skillName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    return null;
  }
  return `$${normalized}`;
}

function parseOptionalEnum<T extends string>(
  values: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T,
  sourcePath: string,
  issues: AgentValidationIssue[]
): T {
  const value = values[key];
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string") {
    issues.push({
      sourcePath,
      message: `Field interface.${key} must be a string when present.`
    });
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (!allowed.includes(normalized as T)) {
    issues.push({
      sourcePath,
      message: `Field interface.${key} must be one of: ${allowed.join(", ")}.`
    });
    return fallback;
  }
  return normalized as T;
}

function parseOptionalStringArray(
  values: Record<string, unknown>,
  key: string,
  sourcePath: string,
  issues: AgentValidationIssue[]
): string[] {
  const value = values[key];
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    issues.push({
      sourcePath,
      message: `Field interface.${key} must be a string array when present.`
    });
    return [];
  }
  return value
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .filter((entry, index, collection) => collection.indexOf(entry) === index);
}

function findDuplicateIds(ids: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }
    seen.add(id);
  }
  return duplicates;
}
