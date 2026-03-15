import * as fs from "fs";
import * as path from "path";

export type LogicsStage = "request" | "backlog" | "task" | "product" | "architecture" | "spec";

export type ManagedDocFamily = {
  stage: LogicsStage;
  dir: string;
  prefixes: string[];
  isPrimaryFlow: boolean;
};

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

export const MANAGED_DOC_FAMILIES: ManagedDocFamily[] = [
  { stage: "request", dir: "logics/request", prefixes: ["req_"], isPrimaryFlow: true },
  { stage: "backlog", dir: "logics/backlog", prefixes: ["item_"], isPrimaryFlow: true },
  { stage: "task", dir: "logics/tasks", prefixes: ["task_"], isPrimaryFlow: true },
  { stage: "product", dir: "logics/product", prefixes: ["prod_"], isPrimaryFlow: false },
  { stage: "architecture", dir: "logics/architecture", prefixes: ["adr_"], isPrimaryFlow: false },
  { stage: "spec", dir: "logics/specs", prefixes: ["spec_", "req_"], isPrimaryFlow: false }
];

export const STAGE_ORDER = MANAGED_DOC_FAMILIES.map((family) => family.stage);
const STAGE_ORDER_INDEX = new Map(STAGE_ORDER.map((stage, index) => [stage, index]));

export function indexLogics(root: string): LogicsItem[] {
  const items: LogicsItem[] = [];
  const promotedSources = new Set<string>();
  const usageMap = new Map<string, LogicsUsage[]>();
  const manualUsedByMap = new Map<string, string[]>();

  for (const family of MANAGED_DOC_FAMILIES) {
    const dirPath = path.join(root, family.dir);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }
      if (!family.prefixes.some((prefix) => entry.name.startsWith(prefix))) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const content = fs.readFileSync(fullPath, "utf8");
      const relPath = path.relative(root, fullPath).replace(/\\/g, "/");
      const references = extractReferences(content);
      const manualUsedBy = [
        ...extractSectionLinks(content, "Used by"),
        ...extractListLinks(content, "Used by")
      ].map(normalizeIndexedRef);
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
        stage: family.stage,
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
      const normalized = normalizeRef(ref.path);
      if (!isManagedDocReference(normalized)) {
        continue;
      }
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

  items.sort((a, b) => compareStages(a.stage, b.stage) || a.id.localeCompare(b.id));
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
    { label: "Derived from", regex: /Derived from(?: [a-z][a-z ]+)? `([^`]+)`/gi }
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(content)) !== null) {
      if (match[1]) {
        refs.push({ kind: "from", label: pattern.label, path: normalizeIndexedRef(match[1]) });
      }
    }
  }

  for (const backlogRef of extractBacklogLinks(content)) {
    refs.push({ kind: "backlog", label: "Backlog", path: normalizeIndexedRef(backlogRef) });
  }

  const manualReferences = [
    ...extractSectionLinks(content, "References"),
    ...extractListLinks(content, "References"),
    ...extractIndicatorLinks(content, ["Related request", "Related backlog", "Related task", "Related architecture"])
  ];
  for (const manualRef of manualReferences) {
    refs.push({ kind: "manual", label: "Reference", path: normalizeIndexedRef(manualRef) });
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

    collectBacktickedLinks(line, links);
  }

  return Array.from(new Set(links));
}

function extractListLinks(content: string, listLabel: string): string[] {
  const lines = content.split(/\r?\n/);
  const links: string[] = [];
  const expectedLabel = listLabel.toLowerCase();
  let inList = false;
  let baseIndent = 0;

  for (const line of lines) {
    const labelMatch = line.match(/^(\s*)-\s*([^:]+):\s*(.*)$/);
    if (labelMatch) {
      const indent = labelMatch[1].length;
      const label = labelMatch[2].trim().toLowerCase();
      const inlineContent = labelMatch[3] ?? "";

      if (inList && indent <= baseIndent && label !== expectedLabel) {
        inList = false;
      }

      if (label === expectedLabel) {
        inList = true;
        baseIndent = indent;
        collectBacktickedLinks(inlineContent, links);
        continue;
      }
    }

    if (!inList) {
      continue;
    }
    if (line.startsWith("# ")) {
      inList = false;
      continue;
    }

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (line.trim() !== "" && indent <= baseIndent) {
      inList = false;
      continue;
    }

    collectBacktickedLinks(line, links);
  }

  return Array.from(new Set(links));
}

function collectBacktickedLinks(line: string, links: string[]): void {
  let match: RegExpExecArray | null;
  const regex = /`([^`]+)`/g;
  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      links.push(match[1]);
    }
  }
}

function extractIndicatorLinks(content: string, indicatorKeys: string[]): string[] {
  const indicators = new Set(indicatorKeys.map((key) => key.trim().toLowerCase()));
  const links: string[] = [];

  for (const line of content.split(/\r?\n/)) {
    if (!line.startsWith(">")) {
      continue;
    }
    const trimmed = line.replace(/^>\s*/, "").trim();
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    if (!indicators.has(key)) {
      continue;
    }

    collectBacktickedLinks(trimmed.slice(separatorIndex + 1), links);
  }

  return Array.from(new Set(links));
}

function normalizeIndexedRef(value: string): string {
  const normalized = normalizeRef(value).replace(/^\.\//, "").trim();
  if (!normalized) {
    return normalized;
  }
  if (normalized.includes("/")) {
    return normalized;
  }

  const bareName = normalized.endsWith(".md") ? normalized.slice(0, -3) : normalized;

  for (const family of MANAGED_DOC_FAMILIES) {
    if (family.prefixes.some((prefix) => bareName.startsWith(prefix))) {
      return `${family.dir}/${bareName}.md`;
    }
  }

  return normalized;
}

function normalizeRef(value: string): string {
  return value.replace(/\\/g, "/");
}

function isManagedDocReference(value: string): boolean {
  const normalized = normalizeIndexedRef(value).toLowerCase();
  return MANAGED_DOC_FAMILIES.some((family) => {
    const normalizedDir = family.dir.toLowerCase();
    return (
      normalized.startsWith(`${normalizedDir}/`) ||
      family.prefixes.some((prefix) => path.basename(normalized, ".md").startsWith(prefix))
    );
  });
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

export function inferStage(relPathLower: string, fileName: string): LogicsStage {
  const normalizedRelPath = relPathLower.replace(/\\/g, "/").replace(/^\.\//, "");
  for (const family of MANAGED_DOC_FAMILIES) {
    const normalizedDir = family.dir.toLowerCase();
    if (
      normalizedRelPath.startsWith(`${normalizedDir}/`) ||
      normalizedRelPath.includes(`/${normalizedDir}/`)
    ) {
      return family.stage;
    }
  }
  for (const family of MANAGED_DOC_FAMILIES) {
    if (family.prefixes.some((prefix) => fileName.startsWith(prefix))) {
      return family.stage;
    }
  }
  return "spec";
}

export function compareStages(left: LogicsStage, right: LogicsStage): number {
  const leftIndex = STAGE_ORDER_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = STAGE_ORDER_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
  return leftIndex - rightIndex;
}

export function getManagedDocDirectories(root: string): string[] {
  return MANAGED_DOC_FAMILIES.map((family) => path.join(root, family.dir));
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
  return Array.from(deduped.values()).sort((a, b) => compareStages(a.stage, b.stage) || a.id.localeCompare(b.id));
}

export function canPromote(stage: LogicsStage): boolean {
  return stage === "request" || stage === "backlog";
}

function normalizeStatus(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isProcessedWorkflowStatus(value: string | undefined): boolean {
  const normalized = normalizeStatus(value);
  return (
    normalized === "ready" ||
    normalized === "in progress" ||
    normalized === "blocked" ||
    normalized === "done" ||
    normalized === "archived"
  );
}

function parseProgress(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const match = value.match(/(\d{1,3})/);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, Math.min(100, parsed));
}

function isProcessedWorkflowItem(item: LogicsItem): boolean {
  if (item.stage !== "backlog" && item.stage !== "task") {
    return false;
  }
  if (isProcessedWorkflowStatus(item.indicators?.Status)) {
    return true;
  }
  return parseProgress(item.indicators?.Progress) === 100;
}

function collectLinkedWorkflowPaths(item: LogicsItem): string[] {
  if (item.stage !== "request") {
    return [];
  }
  const paths = new Set<string>();
  for (const ref of item.references) {
    if (ref.kind === "backlog" || ref.kind === "from" || ref.kind === "manual") {
      paths.add(normalizeRef(ref.path));
    }
  }
  for (const usage of item.usedBy ?? []) {
    if (usage.relPath) {
      paths.add(normalizeRef(usage.relPath));
    }
  }
  return Array.from(paths);
}

function workflowCandidateKeys(candidate: LogicsItem): string[] {
  const keys = new Set<string>();
  if (candidate.relPath) {
    const normalizedPath = normalizeRef(candidate.relPath);
    keys.add(normalizedPath);
    keys.add(path.basename(normalizedPath, ".md"));
  }
  if (candidate.id) {
    keys.add(candidate.id);
  }
  return Array.from(keys);
}

export function isRequestProcessed(item: LogicsItem, allItems: LogicsItem[] = []): boolean {
  if (item.stage !== "request") {
    return false;
  }
  const linkedPaths = collectLinkedWorkflowPaths(item);
  if (linkedPaths.length === 0 || !Array.isArray(allItems) || allItems.length === 0) {
    return false;
  }
  const linkedItems = new Map<string, LogicsItem>();
  for (const candidate of allItems) {
    for (const key of workflowCandidateKeys(candidate)) {
      if (!linkedItems.has(key)) {
        linkedItems.set(key, candidate);
      }
    }
  }
  return linkedPaths.some((linkedPath) => {
    const linked = linkedItems.get(linkedPath);
    if (!linked) {
      return false;
    }
    return isProcessedWorkflowItem(linked);
  });
}

export function isRequestUsed(item: LogicsItem, allItems: LogicsItem[] = []): boolean {
  return isRequestProcessed(item, allItems);
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
