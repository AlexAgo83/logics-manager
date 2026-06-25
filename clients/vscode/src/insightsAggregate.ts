import { LogicsItem } from "./logicsIndexer";
import { asString, getUtcIsoWeekStart, getUtcMonthStart, parseProgress, parseTimestamp, formatTimelineLabel } from "./insightsFormat";
import { CLOSED_STATUSES } from "./workflowStatuses.generated";

export type CountMap = Record<string, number>;

export type TimelinePoint = {
  label: string;
  value: number;
};

export type TimelinePeriod = "day" | "week";

export { CLOSED_STATUSES };
export const WORKFLOW_STAGES = new Set<LogicsItem["stage"]>(["request", "backlog", "task"]);

export function countBy(items: LogicsItem[], selector: (item: LogicsItem) => string): CountMap {
  const counts: CountMap = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function summarizeProgress(items: LogicsItem[]): CountMap {
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

export function summarizeVelocity(items: LogicsItem[], nowMs: number): { week: number; month: number } {
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

export function normalizeStatus(value: unknown): string {
  return asString(value, "").toLowerCase();
}

export function isTerminalStatus(value: unknown): boolean {
  return new Set(["done", "archived", "obsolete"]).has(normalizeStatus(value));
}

export function isActiveStatus(value: unknown): boolean {
  return new Set(["draft", "ready", "in progress", "blocked"]).has(normalizeStatus(value));
}

export function summarizeTimeline(
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
