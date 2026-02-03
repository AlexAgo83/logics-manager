import * as fs from "fs";
import * as path from "path";

export type LogicsStage = "request" | "backlog" | "task" | "spec";

export interface LogicsItem {
  id: string;
  title: string;
  stage: LogicsStage;
  path: string;
  relPath: string;
  filename: string;
  updatedAt: string;
  indicators: Record<string, string>;
  isPromoted: boolean;
  references: LogicsReference[];
  usedBy: LogicsUsage[];
}

export interface LogicsReference {
  kind: "from" | "backlog" | "manual";
  label: string;
  path: string;
}

export interface LogicsUsage {
  id: string;
  title: string;
  stage: LogicsStage;
  relPath: string;
}
const STAGES: Array<{ stage: LogicsStage; dir: string; prefix: string }> = [
  { stage: "request", dir: "logics/request", prefix: "req_" },
  { stage: "backlog", dir: "logics/backlog", prefix: "item_" },
  { stage: "task", dir: "logics/tasks", prefix: "task_" },
  { stage: "spec", dir: "logics/specs", prefix: "spec_" }
];

export function indexLogics(root: string): LogicsItem[] {
  const items: LogicsItem[] = [];
  const promotedSources = new Set<string>();
  const usageMap = new Map<string, LogicsUsage[]>();
  const manualUsedByMap = new Map<string, string[]>();

  for (const stageInfo of STAGES) {
    const dirPath = path.join(root, stageInfo.dir);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      if (!entry.name.startsWith(stageInfo.prefix)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const content = fs.readFileSync(fullPath, "utf8");
      const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
      const references = extractReferences(content);
      const manualUsedBy = extractSectionLinks(content, "Used by").map(normalizeRef);
      manualUsedByMap.set(relPath, manualUsedBy);
      const fromRefs = references
        .filter((ref) => ref.kind === "from")
        .map((ref) => normalizeRef(ref.path));
      for (const ref of fromRefs) {
        promotedSources.add(ref);
      }
      const lines = content.split(/\r?\n/);
      const title = parseTitle(lines, entry.name.replace(/\.md$/, ""));
      const indicators = parseIndicators(lines);
      const stat = fs.statSync(fullPath);

      items.push({
        id: entry.name.replace(/\.md$/, ""),
        title,
        stage: stageInfo.stage,
        path: fullPath,
        relPath,
        filename: entry.name,
        updatedAt: stat.mtime.toISOString(),
        indicators,
        isPromoted: false,
        references,
        usedBy: []
      });
    }
  }

  for (const item of items) {
    item.isPromoted = promotedSources.has(item.relPath);
  }

  for (const item of items) {
    for (const ref of item.references) {
      if (ref.kind !== "from") {
        continue;
      }
      const normalized = normalizeRef(ref.path);
      const existing = usageMap.get(normalized) ?? [];
      existing.push({
        id: item.id,
        title: item.title,
        stage: item.stage,
        relPath: item.relPath
      });
      usageMap.set(normalized, existing);
    }
  }

  for (const item of items) {
    const autoUsedBy = usageMap.get(item.relPath) ?? [];
    const manualPaths = manualUsedByMap.get(item.relPath) ?? [];
    const manualUsedBy = manualPaths.map((relPath) => toUsage(relPath, items, root));
    item.usedBy = mergeUsages(autoUsedBy, manualUsedBy);
  }

  items.sort((a, b) => a.stage.localeCompare(b.stage) || a.id.localeCompare(b.id));
  return items;
}

function parseTitle(lines: string[], fallback: string): string {
  for (const line of lines) {
    if (line.startsWith("## ")) {
      const raw = line.slice(3).trim();
      const match = raw.match(/^\S+\s*-\s*(.+)$/);
      return (match ? match[1] : raw).trim();
    }
  }
  return fallback;
}

function parseIndicators(lines: string[]): Record<string, string> {
  const indicators: Record<string, string> = {};
  for (const line of lines) {
    if (!line.startsWith(">")) {
      continue;
    }
    const trimmed = line.replace(/^>\s*/, "").trim();
    if (!trimmed.includes(":")) {
      continue;
    }
    const [key, ...rest] = trimmed.split(":");
    const value = rest.join(":").trim();
    if (key && value) {
      indicators[key.trim()] = value;
    }
  }
  return indicators;
}

function extractReferences(content: string): LogicsReference[] {
  const refs: LogicsReference[] = [];
  const patterns: Array<{ label: string; regex: RegExp }> = [
    { label: "Promoted from", regex: /Promoted from `([^`]+)`/g },
    { label: "Derived from", regex: /Derived from `([^`]+)`/g }
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      if (match[1]) {
        refs.push({ kind: "from", label: pattern.label, path: match[1] });
      }
    }
  }

  for (const backlogRef of extractBacklogLinks(content)) {
    refs.push({ kind: "backlog", label: "Backlog", path: backlogRef });
  }

  for (const manualRef of extractSectionLinks(content, "References")) {
    refs.push({ kind: "manual", label: "Reference", path: manualRef });
  }

  return refs;
}

function extractBacklogLinks(content: string): string[] {
  return extractSectionLinks(content, "Backlog");
}

function extractSectionLinks(content: string, sectionTitle: string): string[] {
  const lines = content.split(/\r?\n/);
  const links: string[] = [];
  let inSection = false;
  const expectedHeader = `# ${sectionTitle}`.toLowerCase();

  for (const line of lines) {
    if (line.trim().toLowerCase() === expectedHeader) {
      inSection = true;
      continue;
    }
    if (!inSection) {
      continue;
    }
    if (line.startsWith("# ")) {
      break;
    }
    if (line.includes("(none yet)")) {
      continue;
    }

    let match: RegExpExecArray | null;
    const regex = /`([^`]+)`/g;
    while ((match = regex.exec(line)) !== null) {
      if (match[1]) {
        links.push(match[1]);
      }
    }
  }

  return Array.from(new Set(links));
}

function normalizeRef(value: string): string {
  return value.replace(/\\/g, "/");
}

function toUsage(relPath: string, items: LogicsItem[], root: string): LogicsUsage {
  const normalized = normalizeRef(relPath);
  const matched = items.find((item) => item.relPath === normalized);
  if (matched) {
    return {
      id: matched.id,
      title: matched.title,
      stage: matched.stage,
      relPath: matched.relPath
    };
  }

  const fileName = path.basename(normalized, ".md");
  const relLower = normalized.toLowerCase();
  const stage: LogicsStage = inferStage(relLower, fileName);
  const title = fileName || path.relative(root, normalized);

  return {
    id: fileName || normalized,
    title,
    stage,
    relPath: normalized
  };
}

function inferStage(relPathLower: string, fileName: string): LogicsStage {
  if (relPathLower.includes("/request/") || fileName.startsWith("req_")) {
    return "request";
  }
  if (relPathLower.includes("/backlog/") || fileName.startsWith("item_")) {
    return "backlog";
  }
  if (relPathLower.includes("/tasks/") || fileName.startsWith("task_")) {
    return "task";
  }
  return "spec";
}

function mergeUsages(...groups: LogicsUsage[][]): LogicsUsage[] {
  const deduped = new Map<string, LogicsUsage>();
  for (const group of groups) {
    for (const usage of group) {
      if (!usage.relPath) {
        continue;
      }
      deduped.set(usage.relPath, usage);
    }
  }
  return Array.from(deduped.values()).sort((a, b) => a.stage.localeCompare(b.stage) || a.id.localeCompare(b.id));
}

export function canPromote(stage: LogicsStage): boolean {
  return stage === "request" || stage === "backlog";
}

export function isRequestUsed(item: LogicsItem): boolean {
  if (item.stage !== "request") {
    return false;
  }
  const hasBacklogRefs = item.references.some((ref) => ref.kind === "backlog");
  return hasBacklogRefs || (Array.isArray(item.usedBy) && item.usedBy.length > 0);
}

export function promotionCommand(stage: LogicsStage): string | null {
  if (stage === "request") {
    return "request-to-backlog";
  }
  if (stage === "backlog") {
    return "backlog-to-task";
  }
  return null;
}
