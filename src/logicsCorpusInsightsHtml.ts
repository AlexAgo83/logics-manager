import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";
import { LogicsItem, compareStages } from "./logicsIndexer";

type CountMap = Record<string, number>;
type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type PieChartSpec = {
  title: string;
  description: string;
  slices: PieSlice[];
  totalLabel: string;
};

type TimelinePoint = {
  label: string;
  value: number;
};

type TimelinePeriod = "day" | "week";
type ExplorerStage = "request" | "backlog" | "task" | "product" | "architecture" | "spec";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asString(value: unknown, fallback = "n/a"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatRelativeDate(value: unknown, fallback = "unknown"): string {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) {
    return asString(value, fallback);
  }
  const diffMs = Date.now() - timestamp;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs >= 0 && diffMs < dayMs) {
    const hours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
    if (hours < 1) {
      const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
      return minutes < 1 ? "just now" : `${minutes} min ago`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function renderList(items: Array<{ label: string; value: string; hint?: string }>, emptyLabel: string): string {
  if (!items.length) {
    return `<p class="logics-insights__empty">${escapeHtml(emptyLabel)}</p>`;
  }
  return `
    <div class="logics-insights__list">
      ${items
        .map(
          (item) => `
            <div class="logics-insights__list-row">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                ${item.hint ? `<span>${escapeHtml(item.hint)}</span>` : ""}
              </div>
              <strong>${escapeHtml(item.value)}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderStatCard(label: string, value: string, hint: string, tone: "neutral" | "good" | "warn" | "bad" = "neutral"): string {
  return `
    <section class="logics-insights__card logics-insights__card--${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(hint)}</em>
    </section>
  `;
}

function buildPieSlices(entries: Array<[string, number]>): PieSlice[] {
  const palette = [
    "var(--vscode-terminal-ansiBlue)",
    "var(--vscode-terminal-ansiGreen)",
    "var(--vscode-terminal-ansiYellow)",
    "var(--vscode-terminal-ansiRed)",
    "var(--vscode-terminal-ansiCyan)",
    "var(--vscode-terminal-ansiMagenta)"
  ];
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({
      label,
      value,
      color: palette[index % palette.length]
    }));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
    "Z"
  ].join(" ");
}

function renderPieChart(spec: PieChartSpec): string {
  const total = spec.slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return `
      <article class="logics-insights__chart-card">
        <h3>${escapeHtml(spec.title)}</h3>
        <p>${escapeHtml(spec.description)}</p>
        <p class="logics-insights__empty">No data available.</p>
      </article>
    `;
  }
  let cursor = 0;
  const segments = spec.slices.map((slice) => {
    const startAngle = cursor;
    const endAngle = cursor + (slice.value / total) * 360;
    cursor = endAngle;
    return {
      ...slice,
      startAngle,
      endAngle
    };
  });
  return `
    <article class="logics-insights__chart-card">
      <h3>${escapeHtml(spec.title)}</h3>
      <p>${escapeHtml(spec.description)}</p>
      <div class="logics-insights__chart">
        <svg viewBox="0 0 120 120" aria-label="${escapeHtml(spec.title)}" role="img">
          <circle cx="60" cy="60" r="38" class="logics-insights__chart-hole"></circle>
          ${
            segments.length === 1
              ? `<circle cx="60" cy="60" r="48" fill="${segments[0].color}"></circle>`
              : segments
                  .map(
                    (slice) => `
                      <path d="${describePieSlice(60, 60, 48, slice.startAngle, slice.endAngle)}" fill="${slice.color}"></path>
                    `
                  )
                  .join("")
          }
          <circle cx="60" cy="60" r="18" class="logics-insights__chart-center"></circle>
          <text x="60" y="57" text-anchor="middle" class="logics-insights__chart-total">${escapeHtml(formatCount(total))}</text>
          <text x="60" y="71" text-anchor="middle" class="logics-insights__chart-total-label">${escapeHtml(spec.totalLabel)}</text>
        </svg>
        <div class="logics-insights__chart-legend">
          ${segments
            .map(
              (slice) => `
                <div class="logics-insights__chart-legend-row">
                  <span class="logics-insights__chart-swatch" style="background:${slice.color}"></span>
                  <div>
                    <strong>${escapeHtml(slice.label)}</strong>
                    <span>${escapeHtml(String(slice.value))} · ${formatPercent(slice.value / total)}</span>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

function countBy(items: LogicsItem[], selector: (item: LogicsItem) => string): CountMap {
  const counts: CountMap = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summarizeProgress(items: LogicsItem[]): CountMap {
  const buckets: CountMap = {
    "100%": 0,
    "50-99%": 0,
    "1-49%": 0,
    "0%": 0,
    "missing": 0
  };
  for (const item of items) {
    const progress = parseProgress(item.indicators.Progress);
    if (progress === null) {
      buckets.missing += 1;
      continue;
    }
    if (progress === 100) {
      buckets["100%"] += 1;
    } else if (progress >= 50) {
      buckets["50-99%"] += 1;
    } else if (progress > 0) {
      buckets["1-49%"] += 1;
    } else {
      buckets["0%"] += 1;
    }
  }
  return buckets;
}

const CLOSED_STATUSES = new Set(["Done", "Archived", "Obsolete"]);
const WORKFLOW_STAGES = new Set<LogicsItem["stage"]>(["request", "backlog", "task"]);

function getUtcIsoWeekStart(timestampMs: number): number {
  const date = new Date(timestampMs);
  const midnightUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = date.getUTCDay() || 7;
  const start = new Date(midnightUtc);
  start.setUTCDate(start.getUTCDate() - (day - 1));
  return start.getTime();
}

function getUtcMonthStart(timestampMs: number): number {
  const date = new Date(timestampMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function summarizeVelocity(items: LogicsItem[], nowMs: number): { week: number; month: number } {
  const closedWorkflowItems = items.filter((item) => WORKFLOW_STAGES.has(item.stage) && CLOSED_STATUSES.has(asString(item.indicators.Status, "")));
  const weekStart = getUtcIsoWeekStart(nowMs);
  const monthStart = getUtcMonthStart(nowMs);
  const counts = {
    week: 0,
    month: 0
  };
  for (const item of closedWorkflowItems) {
    const timestamp = parseTimestamp(item.updatedAt);
    if (timestamp === null || timestamp > nowMs) {
      continue;
    }
    if (timestamp >= weekStart) {
      counts.week += 1;
    }
    if (timestamp >= monthStart) {
      counts.month += 1;
    }
  }
  return counts;
}

function normalizeStatus(value: unknown): string {
  return asString(value, "").toLowerCase();
}

function isTerminalStatus(value: unknown): boolean {
  return new Set(["done", "archived", "obsolete"]).has(normalizeStatus(value));
}

function isActiveStatus(value: unknown): boolean {
  return new Set(["draft", "ready", "in progress", "blocked"]).has(normalizeStatus(value));
}

function formatTimelineLabel(timestampMs: number, compact = false): string {
  const date = new Date(timestampMs);
  if (compact) {
    const month = new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC"
    })
      .format(date)
      .charAt(0);
    const day = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      timeZone: "UTC"
    }).format(date);
    return `${month}${day}`;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function summarizeTimeline(
  items: LogicsItem[],
  nowMs: number,
  options: { period?: TimelinePeriod; bucketCount?: number } = {}
): TimelinePoint[] {
  const period = options.period ?? "week";
  const bucketCount = options.bucketCount ?? (period === "day" ? 15 : 6);
  const closedWorkflowItems = items.filter((item) => WORKFLOW_STAGES.has(item.stage) && CLOSED_STATUSES.has(asString(item.indicators.Status, "")));
  const bucketDurationMs = period === "day" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const currentBucketStart = period === "day" ? Date.UTC(new Date(nowMs).getUTCFullYear(), new Date(nowMs).getUTCMonth(), new Date(nowMs).getUTCDate()) : getUtcIsoWeekStart(nowMs);
  const firstBucketStart = currentBucketStart - (bucketCount - 1) * bucketDurationMs;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = firstBucketStart + index * bucketDurationMs;
    return {
      label: formatTimelineLabel(bucketStart, period === "day"),
      value: 0,
      startMs: bucketStart,
      endMs: bucketStart + bucketDurationMs
    };
  });

  for (const item of closedWorkflowItems) {
    const timestamp = parseTimestamp(item.updatedAt);
    if (timestamp === null || timestamp > nowMs || timestamp < firstBucketStart) {
      continue;
    }
    const index = Math.min(bucketCount - 1, Math.floor((timestamp - firstBucketStart) / bucketDurationMs));
    buckets[index].value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

function renderTimelineBody(points: TimelinePoint[], emptyMessage: string): string {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  if (total <= 0) {
    return `<p class="logics-insights__empty logics-insights__timeline-empty">${escapeHtml(emptyMessage)}</p>`;
  }
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = 720;
  const chartHeight = 200;
  const chartLeft = 36;
  const chartTop = 24;
  const chartBottom = 150;
  const chartUsableHeight = chartBottom - chartTop;
  const slotWidth = (chartWidth - chartLeft * 2) / points.length;
  const barWidth = Math.max(16, Math.min(38, slotWidth - 12));
  const xCenterOffset = slotWidth / 2;

  return `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="Delivery timeline">
      <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartWidth - chartLeft}" y2="${chartBottom}" class="logics-insights__timeline-axis"></line>
      ${points
        .map((point, index) => {
          const x = chartLeft + index * slotWidth + xCenterOffset - barWidth / 2;
          const barHeight = Math.max(4, Math.round((point.value / maxValue) * chartUsableHeight));
          const y = chartBottom - barHeight;
          return `
            <g>
              <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth}" height="${barHeight}" rx="6" class="logics-insights__timeline-bar"></rect>
              <text x="${(x + barWidth / 2).toFixed(2)}" y="${(y - 6).toFixed(2)}" text-anchor="middle" class="logics-insights__timeline-count">${point.value}</text>
              <text x="${(x + barWidth / 2).toFixed(2)}" y="${(chartBottom + 16).toFixed(2)}" text-anchor="middle" class="logics-insights__timeline-label">${escapeHtml(point.label)}</text>
            </g>
          `;
        })
        .join("")}
    </svg>
  `;
}

function renderTimelineChart(title: string, description: string, weekPoints: TimelinePoint[], dayPoints: TimelinePoint[]): string {
  const weekEmpty = "No closed items in the last 6 weeks.";
  const dayEmpty = "No closed items in the last 15 days.";
  const weekBody = renderTimelineBody(weekPoints, weekEmpty);
  const dayBody = renderTimelineBody(dayPoints, dayEmpty);
  return `
    <article class="logics-insights__chart-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      <div class="logics-insights__timeline-toolbar" role="tablist" aria-label="Timeline period">
        <button class="logics-insights__button logics-insights__button--active" type="button" data-timeline-period="week" role="tab" aria-controls="timeline-week" aria-selected="true" aria-pressed="true">Week</button>
        <button class="logics-insights__button" type="button" data-timeline-period="day" role="tab" aria-controls="timeline-day" aria-selected="false" aria-pressed="false">Day</button>
      </div>
      <div
        class="logics-insights__timeline"
        data-timeline-root
        data-timeline-title="${escapeHtml(title)}"
        data-timeline-active="week"
      >
        <div class="logics-insights__timeline-panel" data-timeline-panel="week" id="timeline-week" role="tabpanel">
          ${weekBody}
        </div>
        <div class="logics-insights__timeline-panel" data-timeline-panel="day" id="timeline-day" role="tabpanel" hidden>
          ${dayBody}
        </div>
      </div>
    </article>
  `;
}

function normalizeManagedLookupValue(value: unknown): string {
  return asString(value, "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "");
}

function buildManagedLookup(items: LogicsItem[]): Map<string, LogicsItem> {
  const lookup = new Map<string, LogicsItem>();
  for (const item of items) {
    const normalizedRelPath = normalizeManagedLookupValue(item.relPath);
    const baseName = normalizedRelPath.split("/").pop()?.replace(/\.md$/i, "") || "";
    const keys = [item.id, item.relPath, normalizedRelPath, baseName].filter((value): value is string => Boolean(value && value.trim()));
    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, item);
      }
    }
  }
  return lookup;
}

function resolveManagedLookupValue(rawValue: unknown, fallbackUsage: { id?: string; relPath?: string }, lookup: Map<string, LogicsItem>): LogicsItem | null {
  if (fallbackUsage?.id && lookup.has(fallbackUsage.id)) {
    return lookup.get(fallbackUsage.id) || null;
  }
  const normalizedValue = normalizeManagedLookupValue(rawValue);
  if (!normalizedValue) {
    return null;
  }
  const baseName = normalizedValue.split("/").pop()?.replace(/\.md$/i, "") || "";
  return lookup.get(normalizedValue) || lookup.get(baseName) || null;
}

function buildCorpusExplorerMap(items: LogicsItem[]) {
  const stageOrder: ExplorerStage[] = ["request", "backlog", "task", "product", "architecture", "spec"];
  const stageLabels: Record<ExplorerStage, string> = {
    request: "Requests",
    backlog: "Backlog",
    task: "Tasks",
    product: "Product",
    architecture: "Architecture",
    spec: "Specs"
  };
  const stageColors: Record<ExplorerStage, string> = {
    request: "var(--vscode-terminal-ansiBlue)",
    backlog: "var(--vscode-terminal-ansiGreen)",
    task: "var(--vscode-terminal-ansiYellow)",
    product: "var(--vscode-terminal-ansiCyan)",
    architecture: "var(--vscode-terminal-ansiMagenta)",
    spec: "var(--vscode-terminal-ansiRed)"
  };
  const stageNodes: Array<{ stage: ExplorerStage; label: string; count: number; x: number; y: number }> = [
    { stage: "request", label: stageLabels.request, count: 0, x: 110, y: 58 },
    { stage: "backlog", label: stageLabels.backlog, count: 0, x: 266, y: 42 },
    { stage: "task", label: stageLabels.task, count: 0, x: 422, y: 58 },
    { stage: "product", label: stageLabels.product, count: 0, x: 160, y: 192 },
    { stage: "architecture", label: stageLabels.architecture, count: 0, x: 360, y: 214 },
    { stage: "spec", label: stageLabels.spec, count: 0, x: 560, y: 176 }
  ];
  const stageCounts = new Map<ExplorerStage, number>(stageOrder.map((stage) => [stage, 0]));
  const stagePairs = new Map<string, number>();
  const lookup = buildManagedLookup(items);
  const relatedCounts = new Map<string, number>();

  for (const item of items) {
    const stage = item.stage as ExplorerStage;
    if (stageCounts.has(stage)) {
      stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    }

    const seenTargets = new Set<string>();
    const registerTarget = (rawValue: unknown, fallbackUsage: { id?: string; relPath?: string } = {}) => {
      const target = resolveManagedLookupValue(rawValue, fallbackUsage, lookup);
      if (!target || target.id === item.id || seenTargets.has(target.id)) {
        return;
      }
      seenTargets.add(target.id);
      const targetStage = target.stage as ExplorerStage;
      const pairKey = `${item.stage}|${target.stage}`;
      stagePairs.set(pairKey, (stagePairs.get(pairKey) || 0) + 1);
      relatedCounts.set(item.id, (relatedCounts.get(item.id) || 0) + 1);
      relatedCounts.set(target.id, (relatedCounts.get(target.id) || 0) + 1);
    };

    for (const reference of item.references || []) {
      if (reference && typeof reference === "object") {
        registerTarget((reference as { path?: unknown }).path);
      }
    }

    for (const usage of item.usedBy || []) {
      if (usage && typeof usage === "object") {
        registerTarget((usage as { relPath?: unknown; id?: unknown }).relPath || (usage as { relPath?: unknown; id?: unknown }).id, usage as { id?: string; relPath?: string });
      }
    }
  }

  const topConnectedDocs = [...items]
    .sort((left, right) => (relatedCounts.get(right.id) || 0) - (relatedCounts.get(left.id) || 0) || compareStages(left.stage, right.stage) || left.id.localeCompare(right.id))
    .slice(0, 5);

  return {
    stageOrder,
    stageLabels,
    stageColors,
    stageNodes: stageNodes.map((node) => ({
      ...node,
      count: stageCounts.get(node.stage) || 0
    })),
    stagePairs,
    topConnectedDocs
  };
}

function renderCorpusExplorerMap(mapData: ReturnType<typeof buildCorpusExplorerMap>): string {
  const { stageNodes, stagePairs, stageColors, stageLabels, stageOrder, topConnectedDocs } = mapData;
  const nodes = Object.fromEntries(stageNodes.map((node) => [node.stage, node] as const)) as Record<ExplorerStage, { stage: ExplorerStage; label: string; count: number; x: number; y: number }>;
  const relatedLinkCount = (stage: ExplorerStage) =>
    Array.from(stagePairs.entries()).reduce((sum, [pairKey, count]) => {
      const [sourceStage, targetStage] = pairKey.split("|") as [ExplorerStage, ExplorerStage];
      return sourceStage === stage || targetStage === stage ? sum + count : sum;
    }, 0);

  const stageSummary = stageOrder
    .map((stage) => ({
      label: stageLabels[stage],
      value: String(nodes[stage]?.count || 0),
      hint: `${relatedLinkCount(stage)} related link${relatedLinkCount(stage) === 1 ? "" : "s"}`
    }))
    .filter((entry) => Number(entry.value) > 0 || Number(entry.hint.split(" ")[0] || 0) > 0);

  return `
    <div class="logics-insights__map-layout">
      <div class="logics-insights__map-stage">
        <div class="logics-insights__map-grid" role="list" aria-label="Corpus families">
          ${stageNodes
            .map((node) => {
              const color = stageColors[node.stage];
              const links = relatedLinkCount(node.stage);
              return `
                <article class="logics-insights__map-family" role="listitem" style="--map-family-color:${color}">
                  <span class="logics-insights__map-family-label">${escapeHtml(node.label)}</span>
                  <strong class="logics-insights__map-family-count">${node.count}</strong>
                  <span class="logics-insights__map-family-subtitle">doc${node.count === 1 ? "" : "s"}</span>
                  <span class="logics-insights__map-family-links">${links} related link${links === 1 ? "" : "s"}</span>
                </article>
              `;
            })
            .join("")}
        </div>
        <p class="logics-insights__map-note">This overview keeps the corpus shape readable at a glance. Use the side panel for exact counts and the most connected docs.</p>
      </div>
      <div class="logics-insights__map-side">
        ${renderList(stageSummary, "No corpus data available.")}
        ${renderList(
          topConnectedDocs.map((item) => ({
            label: `${item.stage} • ${item.title}`,
            value: String((item.references.length + item.usedBy.length) || 0),
            hint: `${item.references.length} outgoing, ${item.usedBy.length} incoming`
          })),
          "No connected docs found."
        )}
      </div>
    </div>
  `;
}

function renderCorpusExplorer(root: string, items: LogicsItem[], weekPoints: TimelinePoint[], dayPoints: TimelinePoint[]): string {
  const mapData = buildCorpusExplorerMap(items);
  return `
    <div class="logics-insights__section">
      <h2>Corpus explorer</h2>
      <p>Current project lens: <strong>${escapeHtml(root || "unknown")}</strong>. Switch between a relationship map and the delivery timeline without leaving the current corpus context.</p>
      <div class="logics-insights__explorer-toolbar" role="tablist" aria-label="Corpus explorer view">
        <button class="logics-insights__button logics-insights__button--active" type="button" data-explorer-view="map" role="tab" aria-controls="explorer-map" aria-selected="true" aria-pressed="true">Map</button>
        <button class="logics-insights__button" type="button" data-explorer-view="timeline" role="tab" aria-controls="explorer-timeline" aria-selected="false" aria-pressed="false">Timeline</button>
      </div>
      <div class="logics-insights__explorer" data-explorer-root data-explorer-active="map">
        <div class="logics-insights__explorer-panel" data-explorer-panel="map" id="explorer-map" role="tabpanel">
          <h3>Relationship map</h3>
          <p>Requests, backlog items, tasks, and companion docs are grouped into compact family tiles so the current corpus shape stays readable at a glance.</p>
          ${renderCorpusExplorerMap(mapData)}
        </div>
        <div class="logics-insights__explorer-panel" data-explorer-panel="timeline" id="explorer-timeline" role="tabpanel" hidden>
          ${renderTimelineChart("Delivery timeline", "Closed workflow items bucketed by week or day across the last 15 days.", weekPoints, dayPoints)}
        </div>
      </div>
    </div>
  `;
}

function summarizeStatusDistribution(items: LogicsItem[]): Array<[string, number]> {
  const counts = countBy(items, (item) => asString(item.indicators.Status, "(missing)"));
  return Object.entries(counts).sort((left, right) => {
    const leftStatus = normalizeStatus(left[0]);
    const rightStatus = normalizeStatus(right[0]);
    const leftRank = isTerminalStatus(leftStatus) ? 1 : 0;
    const rightRank = isTerminalStatus(rightStatus) ? 1 : 0;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return right[1] - left[1] || left[0].localeCompare(right[0]);
  });
}

function summarizeThemeDistribution(items: LogicsItem[]): Array<[string, number]> {
  return Object.entries(countBy(items, (item) => asString(item.indicators.Theme, "(none)")))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function summarizeIndicatorBuckets(items: LogicsItem[], key: "Understanding" | "Confidence"): Array<{ label: string; value: string; hint: string }> {
  const buckets = {
    "< 70%": 0,
    "70-90%": 0,
    "> 90%": 0,
    missing: 0
  };
  for (const item of items) {
    const parsed = parseProgress(item.indicators[key]);
    if (parsed === null) {
      buckets.missing += 1;
      continue;
    }
    if (parsed < 70) {
      buckets["< 70%"] += 1;
    } else if (parsed <= 90) {
      buckets["70-90%"] += 1;
    } else {
      buckets["> 90%"] += 1;
    }
  }
  return Object.entries(buckets).map(([label, value]) => ({
    label,
    value: String(value),
    hint: label === "missing" ? "Indicator not present" : `${key} bucket`
  }));
}

function summarizeRequestsWithoutBacklog(items: LogicsItem[]): LogicsItem[] {
  return items.filter((item) => {
    if (item.stage !== "request") {
      return false;
    }
    const status = asString(item.indicators.Status, "");
    if (isTerminalStatus(status)) {
      return false;
    }
    return !(item.usedBy || []).some((usage) => usage.stage === "backlog");
  });
}

function summarizeStaleOpenItems(items: LogicsItem[], nowMs: number): LogicsItem[] {
  const thresholdMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!WORKFLOW_STAGES.has(item.stage)) {
      return false;
    }
    if (isTerminalStatus(item.indicators.Status)) {
      return false;
    }
    const updatedAt = parseTimestamp(item.updatedAt);
    return updatedAt !== null && updatedAt < thresholdMs;
  });
}

function compareByConnectionStrength(left: LogicsItem, right: LogicsItem): number {
  const leftScore = left.references.length + left.usedBy.length;
  const rightScore = right.references.length + right.usedBy.length;
  return rightScore - leftScore || compareStages(left.stage, right.stage) || left.id.localeCompare(right.id);
}

export function buildLogicsCorpusInsightsHtml(params: {
  webview: vscode.Webview;
  root: string;
  items: LogicsItem[];
}): string {
  const { webview, root, items } = params;
  void webview;
  const nonce = getNonce();
  const stageCounts = countBy(items, (item) => item.stage);
  const workflowItems = items.filter((item) => ["request", "backlog", "task"].includes(item.stage));
  const companionItems = items.filter((item) => ["product", "architecture", "spec"].includes(item.stage));
  const totalReferences = items.reduce((sum, item) => sum + item.references.length, 0);
  const totalUsedBy = items.reduce((sum, item) => sum + item.usedBy.length, 0);
  const orphanedItems = items.filter((item) => item.references.length === 0 && item.usedBy.length === 0);
  const progressCounts = summarizeProgress(workflowItems.filter((item) => item.stage === "backlog" || item.stage === "task"));
  const mostConnected = [...items].sort(compareByConnectionStrength).slice(0, 5);
  const largestItems = [...items].sort((left, right) => right.lineCount - left.lineCount || left.id.localeCompare(right.id)).slice(0, 5);
  const mostRecent = [...items].sort((left, right) => {
    const leftTime = parseTimestamp(left.updatedAt) ?? Number.NEGATIVE_INFINITY;
    const rightTime = parseTimestamp(right.updatedAt) ?? Number.NEGATIVE_INFINITY;
    return rightTime - leftTime;
  }).slice(0, 5);
  const indexExists = Boolean(root) && fs.existsSync(path.join(root, "logics", "INDEX.md"));
  const relationshipsExists = Boolean(root) && fs.existsSync(path.join(root, "logics", "RELATIONSHIPS.md"));
  const docsWithNoIncoming = items.filter((item) => item.usedBy.length === 0);
  const docsWithNoOutgoing = items.filter((item) => item.references.length === 0);
  const totalLines = items.reduce((sum, item) => sum + item.lineCount, 0);
  const totalChars = items.reduce((sum, item) => sum + item.charCount, 0);
  const averageLines = items.length > 0 ? totalLines / items.length : 0;
  const velocityCounts = summarizeVelocity(items, Date.now());
  const nowMs = Date.now();
  const weekTimelinePoints = summarizeTimeline(items, nowMs, { period: "week", bucketCount: 6 });
  const dayTimelinePoints = summarizeTimeline(items, nowMs, { period: "day", bucketCount: 15 });
  const blockedItems = workflowItems.filter((item) => asString(item.indicators.Status, "") === "Blocked");
  const wipItems = workflowItems.filter((item) => asString(item.indicators.Status, "") === "In progress");
  const staleItems = summarizeStaleOpenItems(workflowItems, nowMs);
  const requestsWithoutBacklog = summarizeRequestsWithoutBacklog(items);
  const statusDistribution = summarizeStatusDistribution(workflowItems);
  const themeDistribution = summarizeThemeDistribution(items);
  const understandingDistribution = summarizeIndicatorBuckets(workflowItems, "Understanding");
  const confidenceDistribution = summarizeIndicatorBuckets(workflowItems, "Confidence");
  const linkedItems = items.filter((item) => item.references.length > 0 || item.usedBy.length > 0);
  const stagePie = buildPieSlices(
    Object.entries(stageCounts)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1])
  );
  const progressPie = buildPieSlices(
    Object.entries(progressCounts)
      .filter(([, count]) => count > 0)
      .sort((left, right) => {
        const order = ["100%", "50-99%", "1-49%", "0%", "missing"];
        return order.indexOf(left[0]) - order.indexOf(right[0]);
      })
  );
  const relationshipPie = buildPieSlices([
    ["Linked docs", linkedItems.length],
    ["Orphaned docs", orphanedItems.length]
  ]);

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Logics Insights</title>
      <style>
        :root {
          color-scheme: light dark;
        }
        body {
          margin: 0;
          font-family: var(--vscode-font-family, sans-serif);
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        .logics-insights {
          padding: 18px 18px 28px;
          max-width: 1280px;
          margin: 0 auto;
        }
        .logics-insights__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          border: 1px solid var(--vscode-panel-border, color-mix(in srgb, currentColor 20%, transparent));
          border-radius: 14px;
          background: color-mix(in srgb, var(--vscode-panel-background, var(--vscode-editor-background)) 92%, transparent);
        }
        .logics-insights__header h1 {
          margin: 0 0 6px;
          font-size: 1.35rem;
        }
        .logics-insights__summary {
          margin: 0;
          opacity: 0.9;
          line-height: 1.5;
        }
        .logics-insights__root {
          margin-top: 6px;
          font-size: 0.92rem;
          opacity: 0.72;
        }
        .logics-insights__toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .logics-insights__button {
          border: 1px solid var(--vscode-button-border, transparent);
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border-radius: 999px;
          padding: 8px 14px;
          cursor: pointer;
          font-weight: 500;
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease, color 120ms ease;
        }
        .logics-insights__button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }
        .logics-insights__button--active {
          background: var(--vscode-button-primaryBackground);
          color: var(--vscode-button-primaryForeground);
          border-color: color-mix(in srgb, var(--vscode-button-primaryBackground) 68%, currentColor 32%);
          box-shadow: 0 2px 10px color-mix(in srgb, currentColor 16%, transparent);
          transform: translateY(-1px);
          font-weight: 600;
        }
        .logics-insights__grid,
        .logics-insights__sections {
          display: grid;
          gap: 14px;
          margin-top: 16px;
        }
        .logics-insights__grid {
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        }
        .logics-insights__card,
        .logics-insights__section,
        .logics-insights__panel {
          border: 1px solid var(--vscode-panel-border, color-mix(in srgb, currentColor 20%, transparent));
          border-radius: 14px;
          background: var(--vscode-sideBar-background, var(--vscode-editor-background));
        }
        .logics-insights__card {
          padding: 14px;
          display: grid;
          gap: 6px;
        }
        .logics-insights__card span,
        .logics-insights__card em {
          opacity: 0.78;
          font-style: normal;
        }
        .logics-insights__card strong {
          font-size: 1.5rem;
        }
        .logics-insights__card--good strong {
          color: var(--vscode-terminal-ansiGreen);
        }
        .logics-insights__card--warn strong {
          color: var(--vscode-terminal-ansiYellow);
        }
        .logics-insights__card--bad strong {
          color: var(--vscode-terminal-ansiRed);
        }
        .logics-insights__section {
          padding: 16px 18px;
        }
        .logics-insights__section h2 {
          margin: 0 0 8px;
          font-size: 1.03rem;
        }
        .logics-insights__section p {
          margin: 0 0 10px;
          line-height: 1.5;
        }
        .logics-insights__section-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .logics-insights__explorer-toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 12px 0 14px;
        }
        .logics-insights__explorer {
          display: grid;
          gap: 14px;
        }
        .logics-insights__explorer-panel {
          border: 1px solid var(--vscode-panel-border, color-mix(in srgb, currentColor 20%, transparent));
          border-radius: 14px;
          background: var(--vscode-sideBar-background, var(--vscode-editor-background));
          padding: 16px 18px;
        }
        .logics-insights__explorer-panel h3 {
          margin: 0 0 6px;
          font-size: 1rem;
        }
        .logics-insights__explorer-panel p {
          margin: 0 0 12px;
          line-height: 1.5;
          opacity: 0.9;
        }
        .logics-insights__map-layout {
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(0, 1.7fr) minmax(240px, 1fr);
          align-items: start;
        }
        .logics-insights__map-stage {
          border-radius: 14px;
          overflow: hidden;
          background: color-mix(in srgb, currentColor 4%, transparent);
          border: 1px solid color-mix(in srgb, currentColor 10%, transparent);
          padding: 10px;
        }
        .logics-insights__map-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .logics-insights__map-family {
          display: grid;
          gap: 6px;
          padding: 14px 14px 13px;
          border-radius: 14px;
          border: 1px solid color-mix(in srgb, var(--map-family-color, currentColor) 55%, transparent);
          background: color-mix(in srgb, var(--map-family-color, currentColor) 10%, transparent);
          min-height: 104px;
        }
        .logics-insights__map-family-label {
          color: var(--vscode-editor-foreground);
          font-size: 0.96rem;
          font-weight: 700;
        }
        .logics-insights__map-family-count {
          font-size: 1.8rem;
          line-height: 1;
          color: var(--vscode-editor-foreground);
        }
        .logics-insights__map-family-subtitle,
        .logics-insights__map-family-links,
        .logics-insights__map-note {
          color: var(--vscode-descriptionForeground);
          font-size: 0.9rem;
          line-height: 1.45;
        }
        .logics-insights__map-note {
          margin: 12px 2px 0;
        }
        .logics-insights__map-side {
          display: grid;
          gap: 14px;
        }
        .logics-insights__chart-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }
        .logics-insights__chart-card {
          border: 1px solid var(--vscode-panel-border, color-mix(in srgb, currentColor 20%, transparent));
          border-radius: 14px;
          background: var(--vscode-sideBar-background, var(--vscode-editor-background));
          padding: 16px 18px;
        }
        .logics-insights__chart-card h3 {
          margin: 0 0 6px;
          font-size: 0.98rem;
        }
        .logics-insights__chart-card p {
          margin: 0 0 12px;
          line-height: 1.5;
          opacity: 0.9;
        }
        .logics-insights__chart {
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(120px, 160px) 1fr;
          align-items: center;
        }
        .logics-insights__chart svg {
          width: 100%;
          max-width: 160px;
          height: auto;
          display: block;
        }
        .logics-insights__chart-hole {
          fill: none;
          stroke: color-mix(in srgb, currentColor 12%, transparent);
          stroke-width: 0;
        }
        .logics-insights__chart-center {
          fill: var(--vscode-sideBar-background, var(--vscode-editor-background));
          stroke: color-mix(in srgb, currentColor 12%, transparent);
          stroke-width: 1;
        }
        .logics-insights__chart-total {
          fill: var(--vscode-editor-foreground);
          font-size: 16px;
          font-weight: 700;
        }
        .logics-insights__chart-total-label {
          fill: var(--vscode-descriptionForeground);
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .logics-insights__chart-legend {
          display: grid;
          gap: 10px;
        }
        .logics-insights__chart-legend-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .logics-insights__chart-legend-row strong,
        .logics-insights__chart-legend-row span {
          display: block;
        }
        .logics-insights__chart-legend-row span {
          opacity: 0.78;
          font-size: 0.9em;
        }
        .logics-insights__chart-swatch {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          margin-top: 4px;
          flex: 0 0 auto;
        }
        .logics-insights__panel {
          padding: 14px;
        }
        .logics-insights__list {
          display: grid;
          gap: 8px;
        }
        .logics-insights__list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
        }
        .logics-insights__list-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }
        .logics-insights__list-row strong {
          min-width: 3.5rem;
          text-align: right;
        }
        .logics-insights__list-row span {
          display: block;
          opacity: 0.8;
        }
        .logics-insights__empty {
          margin: 0;
          opacity: 0.72;
        }
        .logics-insights__status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: color-mix(in srgb, currentColor 10%, transparent);
        }
        .logics-insights__status--good { color: var(--vscode-terminal-ansiGreen); }
        .logics-insights__status--warn { color: var(--vscode-terminal-ansiYellow); }
        .logics-insights__status--bad { color: var(--vscode-terminal-ansiRed); }
        .logics-insights__footer {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--vscode-panel-border, color-mix(in srgb, currentColor 20%, transparent));
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .logics-insights__footer-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .logics-insights__footer-button {
          border: 1px solid var(--vscode-button-border, transparent);
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border-radius: 999px;
          padding: 8px 12px;
          cursor: pointer;
        }
        .logics-insights__footer-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }
      .logics-insights__timeline {
        overflow-x: auto;
      }
      .logics-insights__timeline-panel[hidden] {
        display: none;
      }
      .logics-insights__timeline-toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
        }
        .logics-insights__timeline-body {
          min-height: 220px;
          display: grid;
          align-items: center;
        }
        .logics-insights__timeline svg {
          min-width: 100%;
          display: block;
        }
        .logics-insights__timeline-axis {
          stroke: color-mix(in srgb, currentColor 18%, transparent);
          stroke-width: 1;
        }
        .logics-insights__timeline-bar {
          fill: var(--vscode-terminal-ansiBlue);
        }
        .logics-insights__timeline-count {
          fill: var(--vscode-editor-foreground);
          font-size: 11px;
          font-weight: 700;
        }
        .logics-insights__timeline-label {
          fill: var(--vscode-descriptionForeground);
          font-size: 10px;
        }
        .logics-insights__stale-card {
          margin-top: 12px;
        }
        @media (max-width: 920px) {
          .logics-insights__header {
            flex-direction: column;
          }
          .logics-insights__chart {
            grid-template-columns: 1fr;
            justify-items: start;
          }
        }
      </style>
    </head>
    <body>
      <main class="logics-insights">
        <header class="logics-insights__header">
          <div>
            <h1>Logics Insights</h1>
            <p class="logics-insights__summary">Repository-level stats for the Logics corpus: volume, links, progress, and the biggest navigation hot spots.</p>
            <div class="logics-insights__root">Workspace root: <strong>${escapeHtml(root || "unknown")}</strong></div>
          </div>
          <div class="logics-insights__toolbar">
            <button class="logics-insights__button" type="button" data-action="refresh-report">Refresh</button>
          </div>
        </header>

        <section class="logics-insights__grid" aria-label="Corpus overview">
          ${renderStatCard("Managed docs", String(items.length), `${workflowItems.length} workflow docs + ${companionItems.length} companion docs`, items.length > 0 ? "good" : "warn")}
          ${renderStatCard("Workflow docs", String(workflowItems.length), "Requests, backlog items, and tasks", "neutral")}
          ${renderStatCard("Companion docs", String(companionItems.length), "Product, architecture, and specs", "neutral")}
          ${renderStatCard("Links", String(totalReferences + totalUsedBy), `${totalReferences} outgoing + ${totalUsedBy} incoming`, totalReferences + totalUsedBy > 0 ? "good" : "warn")}
          ${renderStatCard("Orphans", String(orphanedItems.length), "Docs with no incoming or outgoing links", orphanedItems.length > 0 ? "warn" : "good")}
          ${renderStatCard("Average size", `${averageLines.toFixed(1)} lines`, `${totalChars.toLocaleString()} chars total`, "neutral")}
        </section>

        <section class="logics-insights__sections">
          <div class="logics-insights__section">
            <h2>Velocity</h2>
            <p>Closed workflow items in the current ISO week and calendar month.</p>
            <div class="logics-insights__section-grid">
              ${renderStatCard("Closed this week", String(velocityCounts.week), "Done, Archived, Obsolete", velocityCounts.week > 0 ? "good" : "warn")}
              ${renderStatCard("Closed this month", String(velocityCounts.month), "Done, Archived, Obsolete", velocityCounts.month > 0 ? "good" : "warn")}
              ${renderStatCard("WIP", String(wipItems.length), "Items with Status = In progress", wipItems.length > 5 ? "warn" : "neutral")}
              ${renderStatCard("Blocked", String(blockedItems.length), "Items with Status = Blocked", blockedItems.length > 0 ? "bad" : "good")}
            </div>
            ${blockedItems.length > 0 ? renderList(blockedItems.slice(0, 10).map((item) => ({
              label: item.title,
              value: item.id,
              hint: `${item.stage} • ${asString(item.indicators.Status, "Blocked")}`
            })), "No blocked items.") : ""}
          </div>

          ${renderCorpusExplorer(root, items, weekTimelinePoints, dayTimelinePoints)}

          <div class="logics-insights__section">
            <h2>Distribution snapshots</h2>
            <p>Compact pies that show how the corpus is split right now.</p>
            <div class="logics-insights__chart-grid">
              ${renderPieChart({
                title: "Stage mix",
                description: "How the corpus is distributed across workflow and companion doc types.",
                slices: stagePie,
                totalLabel: "docs"
              })}
              ${renderPieChart({
                title: "Progress mix",
                description: "How backlog and task work is distributed across the current progress buckets.",
                slices: progressPie,
                totalLabel: "items"
              })}
              ${renderPieChart({
                title: "Link coverage",
                description: "Whether docs are connected to the corpus or still isolated.",
                slices: relationshipPie,
                totalLabel: "docs"
              })}
            </div>
          </div>

          <div class="logics-insights__section">
            <h2>Status distribution</h2>
            <p>Workflow items grouped by their current Status, with active items first.</p>
            <div class="logics-insights__section-grid">
              ${renderList(
                statusDistribution.map(([status, count]) => ({
                  label: status,
                  value: String(count),
                  hint: items.length > 0 ? formatPercent(count / workflowItems.length) : "0%"
                })),
                "No status data available."
              )}
            </div>
          </div>

          <div class="logics-insights__section">
            <h2>Theme distribution</h2>
            <p>All docs grouped by Theme, with missing values collected together.</p>
            ${renderList(
              themeDistribution.map(([theme, count]) => ({
                label: theme,
                value: String(count),
                hint: items.length > 0 ? formatPercent(count / items.length) : "0%"
              })),
              "No theme data available."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Understanding distribution</h2>
            <p>Workflow items bucketed by Understanding percentage.</p>
            ${renderList(understandingDistribution, "No Understanding data available.")}
          </div>

          <div class="logics-insights__section">
            <h2>Confidence distribution</h2>
            <p>Workflow items bucketed by Confidence percentage.</p>
            ${renderList(confidenceDistribution, "No Confidence data available.")}
          </div>

          <div class="logics-insights__section">
            <h2>Requests without backlog</h2>
            <p>Open requests that do not currently link to any backlog child.</p>
            ${renderList(
              requestsWithoutBacklog.map((item) => ({
                label: item.title,
                value: item.id,
                hint: `${item.stage} • ${asString(item.indicators.Status, "open")}`
              })),
              "No open requests without backlog links."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Stale open items</h2>
            <p>Workflow items that are still open and have not been updated in 30 days.</p>
            ${renderList(
              staleItems.slice(0, 10).map((item) => {
                const updatedAt = parseTimestamp(item.updatedAt) ?? nowMs;
                const daysOld = Math.max(1, Math.floor((nowMs - updatedAt) / (24 * 60 * 60 * 1000)));
                return {
                  label: item.title,
                  value: `${daysOld}d`,
                  hint: `${item.stage} • ${asString(item.indicators.Status, "open")}`
                };
              }),
              "No stale open items found."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Stage distribution</h2>
            <p>How the corpus breaks down by managed doc family.</p>
            <div class="logics-insights__section-grid">
              ${Object.entries(stageCounts)
                .sort((left, right) => right[1] - left[1])
                .map(
                  ([stage, count]) => `
                    <div class="logics-insights__panel">
                      <div class="logics-insights__status">${escapeHtml(stage)}</div>
                      <p>${count} doc(s), ${items.length > 0 ? formatPercent(count / items.length) : "0%"}</p>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>

          <div class="logics-insights__section">
            <h2>Progress distribution</h2>
            <p>Backlog and task progress buckets, based on the current Progress indicator.</p>
            ${renderList(
              Object.entries(progressCounts).map(([label, value]) => ({
                label,
                value: String(value),
                hint: label === "100%" ? "Completed or fully closed" : label === "missing" ? "No progress indicator" : "In flight"
              })),
              "No progress data available."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Relationship hot spots</h2>
            <p>Docs that participate in the most links, plus current generated-view coverage.</p>
            ${renderList(
              [
                { label: "Generated INDEX.md", value: indexExists ? "present" : "missing", hint: "Navigation entry point" },
                { label: "Generated RELATIONSHIPS.md", value: relationshipsExists ? "present" : "missing", hint: "Relationship surface" },
                { label: "Docs with no incoming links", value: String(docsWithNoIncoming.length), hint: "Potentially hidden docs" },
                { label: "Docs with no outgoing links", value: String(docsWithNoOutgoing.length), hint: "May need more refs" }
              ],
              "No relationship data available."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Most connected docs</h2>
            <p>The items with the most total links in and out.</p>
            ${renderList(
              mostConnected.map((item) => ({
                label: `${item.stage} • ${item.title}`,
                value: String(item.references.length + item.usedBy.length),
                hint: `${item.references.length} outgoing, ${item.usedBy.length} incoming`
              })),
              "No connected docs found."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Largest docs</h2>
            <p>Heavy files are often the first place where navigation or maintenance cost shows up.</p>
            ${renderList(
              largestItems.map((item) => ({
                label: `${item.stage} • ${item.title}`,
                value: `${item.lineCount} lines`,
                hint: item.relPath
              })),
              "No large docs found."
            )}
          </div>

          <div class="logics-insights__section">
            <h2>Recently updated</h2>
            <p>The most recently touched docs in the corpus.</p>
            ${renderList(
              mostRecent.map((item) => ({
                label: `${item.stage} • ${item.title}`,
                value: formatRelativeDate(item.updatedAt),
                hint: item.relPath
              })),
              "No recent update data available."
            )}
          </div>
        </section>

        <footer class="logics-insights__footer">
          <p class="logics-insights__summary">Need a refresher or more context? Open the onboarding guide or jump to the repository page.</p>
          <div class="logics-insights__footer-actions">
            <button class="logics-insights__footer-button" type="button" data-action="open-onboarding">Getting Started</button>
            <button class="logics-insights__footer-button" type="button" data-action="about">About</button>
          </div>
        </footer>
      </main>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        function renderTimeline(period) {
          const root = document.querySelector("[data-timeline-root]");
          if (!root) {
            return;
          }
          const activePeriod = period === "day" ? "day" : "week";
          root.setAttribute("data-timeline-active", activePeriod);
          root.querySelectorAll("[data-timeline-panel]").forEach((panel) => {
            const isActive = panel.getAttribute("data-timeline-panel") === activePeriod;
            panel.hidden = !isActive;
          });
          document.querySelectorAll("[data-timeline-period]").forEach((button) => {
            const isActive = button.getAttribute("data-timeline-period") === activePeriod;
            button.classList.toggle("logics-insights__button--active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
            button.setAttribute("aria-selected", String(isActive));
          });
        }

        function renderExplorer(view) {
          const root = document.querySelector("[data-explorer-root]");
          if (!root) {
            return;
          }
          const activeView = view === "timeline" ? "timeline" : "map";
          root.setAttribute("data-explorer-active", activeView);
          root.querySelectorAll("[data-explorer-panel]").forEach((panel) => {
            const isActive = panel.getAttribute("data-explorer-panel") === activeView;
            panel.hidden = !isActive;
          });
          document.querySelectorAll("[data-explorer-view]").forEach((button) => {
            const isActive = button.getAttribute("data-explorer-view") === activeView;
            button.classList.toggle("logics-insights__button--active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
            button.setAttribute("aria-selected", String(isActive));
          });
        }

        document.querySelector('[data-action="refresh-report"]')?.addEventListener('click', () => {
          vscode.postMessage({ type: 'refresh-report' });
        });
        document.querySelectorAll('[data-action="open-onboarding"], [data-action="about"]').forEach((button) => {
          button.addEventListener('click', () => {
            const action = button.getAttribute('data-action');
            if (action === 'open-onboarding' || action === 'about') {
              vscode.postMessage({ type: action });
            }
          });
        });
        document.querySelectorAll("[data-timeline-period]").forEach((button) => {
          button.addEventListener("click", () => {
            const period = button.getAttribute("data-timeline-period") || "week";
            renderTimeline(period);
          });
        });
        document.querySelectorAll("[data-explorer-view]").forEach((button) => {
          button.addEventListener("click", () => {
            const view = button.getAttribute("data-explorer-view") || "map";
            renderExplorer(view);
          });
        });
        renderExplorer("map");
        renderTimeline("week");
      </script>
    </body>
  </html>`;
}
