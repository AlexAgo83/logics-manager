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
  summaryPoints: string[];
  acceptanceCriteria: string[];
  lineCount: number;
  charCount: number;
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
      const summaryPoints = buildSummaryPoints(content, title);
      const acceptanceCriteria = extractSummaryEntries(content, "Acceptance criteria", 6);

      items.push({
        id: entry.name.replace(/\.md$/, ""),
        title,
        stage: family.stage,
        path: fullPath,
        relPath,
        filename: entry.name,
        updatedAt: stat.mtime.toISOString(),
        indicators,
        summaryPoints,
        acceptanceCriteria,
        lineCount: lines.length,
        charCount: content.length,
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

function buildSummaryPoints(content: string, fallbackTitle: string): string[] {
  const summary = [
    ...extractSummaryEntries(content, "Needs", 2),
    ...extractSummaryEntries(content, "Problem", 2),
    ...extractSummaryEntries(content, "Context", 2),
    ...extractSummaryEntries(content, "Scope", 2)
  ];
  const deduped = dedupeSummaryEntries(summary).slice(0, 4);
  if (deduped.length > 0) {
    return deduped;
  }
  return [fallbackTitle];
}

function extractSummaryEntries(content: string, sectionTitle: string, limit: number): string[] {
  const lines = extractSectionLines(content, sectionTitle);
  if (lines.length === 0) {
    return [];
  }
  const entries: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (/^-+\s*$/.test(line) || /^```/.test(line) || /^%%/.test(line)) {
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch && bulletMatch[1]) {
      entries.push(normalizeSummaryEntry(bulletMatch[1]));
    } else if (!line.startsWith("#")) {
      entries.push(normalizeSummaryEntry(line.replace(/^>\s*/, "")));
    }
    if (entries.length >= limit) {
      break;
    }
  }
  return dedupeSummaryEntries(entries).slice(0, limit);
}

function extractSectionLines(content: string, sectionTitle: string): string[] {
  const lines = content.split(/\r?\n/);
  const expectedHeader = `# ${sectionTitle}`.toLowerCase();
  const collected: string[] = [];
  let inSection = false;
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
    collected.push(line);
  }
  return collected;
}

function normalizeSummaryEntry(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeSummaryEntries(entries: string[]): string[] {
  return entries.filter(
    (entry, index, collection) =>
      entry.length > 0 &&
      collection.findIndex((candidate) => candidate.toLowerCase() === entry.toLowerCase()) === index
  );
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
    normalized === "done" ||
    normalized === "complete" ||
    normalized === "completed" ||
    normalized === "archived"
  );
}

function parseProgress(value: string | undefined): number | null {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function isProcessedWorkflowItem(item: LogicsItem | undefined): boolean {
  if (!item) {
    return false;
  }
  const stage = String(item.stage || "").trim();
  if (stage !== "backlog" && stage !== "task") {
    return false;
  }
  if (isProcessedWorkflowStatus(item.indicators?.Status)) {
    return true;
  }
  const progress = parseProgress(item.indicators?.Progress);
  return progress === 100;
}

function normalizeIndexedReference(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/");
}

function normalizeReferencePath(value: string): string {
  const normalized = normalizeIndexedReference(value);
  if (!normalized) {
    return "";
  }
  return normalized.split("/").pop()?.replace(/\.md$/i, "") || normalized;
}

function collectLinkedWorkflowItems(item: LogicsItem, allItems: LogicsItem[] = []): LogicsItem[] {
  if (!item || item.stage !== "request") {
    return [];
  }

  const linkedValues = new Set<string>();
  for (const reference of item.references || []) {
    if (reference && typeof reference.path === "string") {
      linkedValues.add(normalizeIndexedReference(reference.path));
      linkedValues.add(normalizeReferencePath(reference.path));
    }
  }
  for (const usage of item.usedBy || []) {
    if (usage && typeof usage.relPath === "string") {
      linkedValues.add(normalizeIndexedReference(usage.relPath));
      linkedValues.add(normalizeReferencePath(usage.relPath));
    }
    if (usage && typeof usage.id === "string") {
      linkedValues.add(normalizeIndexedReference(usage.id));
    }
  }

  const linkedItems = new Map<string, LogicsItem>();
  for (const candidate of allItems || []) {
    if (!candidate) {
      continue;
    }
    const keys = new Set<string>();
    if (candidate.relPath) {
      keys.add(normalizeIndexedReference(candidate.relPath));
      keys.add(normalizeReferencePath(candidate.relPath));
    }
    if (candidate.id) {
      keys.add(candidate.id);
    }
    for (const key of keys) {
      if (key && !linkedItems.has(key)) {
        linkedItems.set(key, candidate);
      }
    }
  }

  return Array.from(linkedValues)
    .map((rawValue) => linkedItems.get(rawValue))
    .filter((candidate, index, collection) => Boolean(candidate) && collection.indexOf(candidate) === index) as LogicsItem[];
}

export function isRequestProcessed(item: LogicsItem, allItems: LogicsItem[] = []): boolean {
  if (item.stage !== "request") {
    return false;
  }
  return collectLinkedWorkflowItems(item, allItems).some((candidate) => isProcessedWorkflowItem(candidate));
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
