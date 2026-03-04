import * as fs from "fs";
import * as path from "path";

export interface AgentDefinition {
  id: string;
  skillName: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string;
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

type ParsedScalar =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null"; value: null };

type ParsedOpenAiInterface = {
  values: Record<string, ParsedScalar>;
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
  const lines = content.split(/\r?\n/);
  const issues: AgentValidationIssue[] = [];
  const values: Record<string, ParsedScalar> = {};

  const interfaceIndex = lines.findIndex((line) => /^\s*interface\s*:\s*(?:#.*)?$/.test(line));
  if (interfaceIndex < 0) {
    issues.push({
      sourcePath,
      message: "Missing top-level 'interface' section."
    });
    return { values, issues };
  }

  for (let i = interfaceIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (indent < 2) {
      break;
    }

    const match = line.match(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      issues.push({
        sourcePath,
        message: `Unsupported interface line format at line ${i + 1}: ${line.trim()}`
      });
      continue;
    }

    const key = match[1];
    const rawValue = match[2] ?? "";
    values[key] = parseYamlScalar(rawValue);
  }

  return { values, issues };
}

function parseYamlScalar(rawValue: string): ParsedScalar {
  const trimmed = rawValue.trim();
  if (trimmed === "" || trimmed === "~" || /^null$/i.test(trimmed)) {
    return { kind: "null", value: null };
  }

  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return { kind: "string", value: decodeQuotedString(trimmed) };
  }

  const withoutComment = stripInlineYamlComment(trimmed);
  if (/^(true|false)$/i.test(withoutComment)) {
    return { kind: "boolean", value: /^true$/i.test(withoutComment) };
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(withoutComment)) {
    return { kind: "number", value: Number(withoutComment) };
  }
  if (withoutComment === "" || withoutComment === "~" || /^null$/i.test(withoutComment)) {
    return { kind: "null", value: null };
  }
  return { kind: "string", value: withoutComment };
}

function decodeQuotedString(value: string): string {
  const quote = value[0];
  const body = value.slice(1, -1);
  if (quote === "'") {
    return body.replace(/''/g, "'");
  }
  return body
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, "\"")
    .replace(/\\\\/g, "\\");
}

function stripInlineYamlComment(value: string): string {
  const commentIndex = value.search(/\s#/);
  if (commentIndex < 0) {
    return value.trim();
  }
  return value.slice(0, commentIndex).trim();
}

function expectRequiredString(
  values: Record<string, ParsedScalar>,
  key: string,
  sourcePath: string,
  issues: AgentValidationIssue[]
): string | null {
  const value = values[key];
  if (!value) {
    issues.push({
      sourcePath,
      message: `Missing required field: interface.${key}`
    });
    return null;
  }
  if (value.kind !== "string") {
    issues.push({
      sourcePath,
      message: `Field interface.${key} must be a string.`
    });
    return null;
  }
  const normalized = value.value.trim();
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
