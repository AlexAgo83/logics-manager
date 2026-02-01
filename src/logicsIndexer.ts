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
  kind: "from" | "backlog";
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
    item.usedBy = usageMap.get(item.relPath) ?? [];
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

  return refs;
}

function extractBacklogLinks(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const links: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.trim() === "# Backlog") {
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
    const match = line.match(/`([^`]+)`/);
    if (match && match[1]) {
      links.push(match[1]);
    }
  }

  return links;
}

function normalizeRef(value: string): string {
  return value.replace(/\\/g, "/");
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
