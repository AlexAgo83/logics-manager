export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function asString(value: unknown, fallback = "n/a"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const raw = value.trim();
  const candidates = [
    raw,
    raw.replace(" ", "T"),
    raw.replace(/(\.\d{3})\d+([zZ]|[+-]\d{2}:\d{2})$/, "$1$2"),
    raw.replace(" ", "T").replace(/(\.\d{3})\d+([zZ]|[+-]\d{2}:\d{2})$/, "$1$2")
  ];
  for (const candidate of candidates) {
    const timestamp = Date.parse(candidate);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return null;
}

export function formatRelativeDate(value: unknown, fallback = "unknown"): string {
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

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function parseProgress(value: string | undefined): number | null {
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

export function getUtcIsoWeekStart(timestampMs: number): number {
  const date = new Date(timestampMs);
  const midnightUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = date.getUTCDay() || 7;
  const start = new Date(midnightUtc);
  start.setUTCDate(start.getUTCDate() - (day - 1));
  return start.getTime();
}

export function getUtcMonthStart(timestampMs: number): number {
  const date = new Date(timestampMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function formatTimelineLabel(timestampMs: number, compact = false): string {
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
