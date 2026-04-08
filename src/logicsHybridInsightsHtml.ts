import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";
import {
  buildCacheRecommendation,
  buildPreclassificationRecommendation,
  buildProfileDowngradeRecommendation,
  getRecentRuns,
  renderRecentRuns,
  renderSignalCards,
  type SignalCard
} from "./logicsHybridInsightsSections";

type CountMap = Record<string, number>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asCountMap(value: unknown): CountMap {
  const record = asRecord(value);
  const next: CountMap = {};
  for (const [key, raw] of Object.entries(record)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      next[key] = raw;
    }
  }
  return next;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = "n/a"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseTimestamp(value: unknown): number | null {
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

function formatAbsoluteDateTime(value: unknown, fallback = "unknown"): string {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) {
    return asString(value, fallback);
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function formatRelativeAge(diffMs: number): string {
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  if (diffMs < minuteMs) {
    return "less than a minute ago";
  }
  if (diffMs < hourMs) {
    const minutes = Math.floor(diffMs / minuteMs);
    return `${minutes} min ago`;
  }
  const hours = Math.floor(diffMs / hourMs);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function formatReadableDateTime(value: unknown, fallback = "unknown"): string {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) {
    return asString(value, fallback);
  }
  const diffMs = Date.now() - timestamp;
  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    return formatRelativeAge(diffMs);
  }
  return formatAbsoluteDateTime(value, fallback);
}

function compareTimestampsDesc(left: unknown, right: unknown): number {
  const leftTime = parseTimestamp(left) ?? Number.NEGATIVE_INFINITY;
  const rightTime = parseTimestamp(right) ?? Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
}

function formatRate(value: unknown): string {
  const rate = asNumber(value, 0);
  return `${(rate * 100).toFixed(rate === 0 ? 0 : 1)}%`;
}

function formatCountMapValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function renderCountMap(map: CountMap, emptyLabel: string): string {
  const entries = Object.entries(map);
  if (!entries.length) {
    return `<p class="hybrid-insights__empty">${escapeHtml(emptyLabel)}</p>`;
  }
  return `
    <div class="hybrid-insights__list">
      ${entries
        .map(
          ([label, count]) => `
            <div class="hybrid-insights__list-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(formatCountMapValue(count))}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRankedItems(value: unknown, emptyLabel: string): string {
  const items = asArray<Record<string, unknown>>(value);
  if (!items.length) {
    return `<p class="hybrid-insights__empty">${escapeHtml(emptyLabel)}</p>`;
  }
  return `
    <div class="hybrid-insights__list">
      ${items
        .map((item) => {
          const label = asString(item.label, "unknown");
          const count = asNumber(item.count, 0);
          return `
            <div class="hybrid-insights__list-row">
              <span>${escapeHtml(label)}</span>
              <strong>${count}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderHealthSummary(value: unknown): string {
  const items = asArray<string>(value);
  if (!items.length) {
    return `<p class="hybrid-insights__empty">No health summary available.</p>`;
  }
  return `
    <div class="hybrid-insights__stack">
      ${items.map((item) => `<div class="hybrid-insights__note">${escapeHtml(item)}</div>`).join("")}
    </div>
  `;
}

function renderFlowBreakdown(value: unknown): string {
  const flows = asRecord(value);
  const entries = Object.entries(flows);
  if (!entries.length) {
    return `<p class="hybrid-insights__empty">No flow breakdown available yet.</p>`;
  }
  return `
    <div class="hybrid-insights__diagnostic-grid">
      ${entries
        .map(([flowName, rawFlow]) => {
          const flow = asRecord(rawFlow);
          const runCount = asNumber(flow.run_count, 0);
          const fallbackRate = asNumber(flow.fallback_rate, 0);
          const degradedRate = asNumber(flow.degraded_rate, 0);
          const reviewRate = asNumber(flow.review_recommended_rate, 0);
          const pressure = [
            { label: "Fallback", rate: fallbackRate },
            { label: "Degraded", rate: degradedRate },
            { label: "Review", rate: reviewRate }
          ].sort((left, right) => right.rate - left.rate)[0];
          const pressureLabel =
            pressure.rate > 0 ? `${pressure.label} pressure ${formatRate(pressure.rate)}` : "No elevated pressure recorded.";
          return `
            <section class="hybrid-insights__diagnostic-card">
              <div class="hybrid-insights__diagnostic-head">
                <div>
                  <h3>${escapeHtml(flowName)}</h3>
                  <p>${escapeHtml(pressureLabel)}</p>
                </div>
                <strong>${runCount} run(s)</strong>
              </div>
              <div class="hybrid-insights__diagnostic-stats">
                <div><span>Fallback</span><strong>${formatRate(fallbackRate)}</strong></div>
                <div><span>Degraded</span><strong>${formatRate(degradedRate)}</strong></div>
                <div><span>Review</span><strong>${formatRate(reviewRate)}</strong></div>
              </div>
              <div class="hybrid-insights__diagnostic-columns">
                <div>
                  <h4>Requested</h4>
                  ${renderCountMap(asCountMap(flow.backend_requested), "No requested backend data.")}
                </div>
                <div>
                  <h4>Used</h4>
                  ${renderCountMap(asCountMap(flow.backend_used), "No backend usage data.")}
                </div>
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

export function buildHybridInsightsHtml(params: {
  webview: vscode.Webview;
  report: Record<string, unknown>;
  rootLabel: string;
}): string {
  const { webview, report, rootLabel } = params;
  void webview;
  const nonce = getNonce();
  const measured = asRecord(report.measured);
  const derived = asRecord(report.derived);
  const estimated = asRecord(report.estimated);
  const totals = asRecord(measured.totals);
  const rates = asRecord(derived.rates);
  const assumptions = asRecord(estimated.assumptions);
  const proxies = asRecord(estimated.proxies);
  const sources = asRecord(report.sources);
  const limits = asRecord(report.limits);
  const reportState = asRecord(derived.report_state);
  const executionPaths = asCountMap(measured.execution_paths);
  const recentRuns = getRecentRuns(report, derived);
  const remoteRuns = executionPaths.remote ?? 0;
  const deterministicRuns = executionPaths.deterministic ?? 0;
  const directCodexRuns = executionPaths["codex-direct"] ?? 0;
  const remoteShare = asNumber(totals.runs, 0) > 0 ? remoteRuns / Math.max(asNumber(totals.runs, 0), 1) : 0;
  const signalCards: SignalCard[] = [
    {
      label: "Local offload",
      value: formatRate(rates.local_offload_rate),
      hint: `${asNumber(totals.local_runs, 0)} local completion(s)`,
      tone: "neutral"
    },
    {
      label: "Fallback",
      value: formatRate(rates.fallback_rate),
      hint: `${asNumber(totals.fallback_runs, 0)} fallback run(s)`,
      tone: asNumber(rates.fallback_rate, 0) >= 0.25 ? "warn" : "neutral"
    },
    {
      label: "Remote share",
      value: formatRate(remoteShare),
      hint: `${remoteRuns} remote provider run(s)`,
      tone: remoteRuns > 0 ? "neutral" : "good"
    },
    {
      label: "Degraded",
      value: formatRate(rates.degraded_rate),
      hint: `${asNumber(totals.degraded_runs, 0)} degraded run(s)`,
      tone: asNumber(rates.degraded_rate, 0) > 0 ? "bad" : "good"
    },
    {
      label: "Review",
      value: formatRate(rates.review_recommended_rate),
      hint: `${asNumber(totals.review_recommended_runs, 0)} run(s) still need attention`,
      tone: asNumber(rates.review_recommended_rate, 0) >= 0.35 ? "warn" : "neutral"
    }
  ];
  const reportFlags = [
    reportState.fallback_heavy ? "Fallback pressure is elevated." : "",
    reportState.degraded_heavy ? "Degraded outcomes need review." : "",
    reportState.review_heavy ? "Review load remains high." : ""
  ].filter((value) => value.length > 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hybrid Assist Insights</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background, #1f1f1f);
      --surface: color-mix(in srgb, var(--vscode-editor-background, #1f1f1f) 84%, white 16%);
      --surface-strong: color-mix(in srgb, var(--vscode-editor-background, #1f1f1f) 72%, white 28%);
      --surface-muted: color-mix(in srgb, var(--vscode-editor-background, #1f1f1f) 88%, white 12%);
      --ink: var(--vscode-editor-foreground, #e6e6e6);
      --muted: color-mix(in srgb, var(--vscode-editor-foreground, #e6e6e6) 68%, transparent 32%);
      --line: color-mix(in srgb, var(--vscode-editor-foreground, #e6e6e6) 16%, transparent 84%);
      --accent: var(--vscode-textLink-foreground, #4ea1ff);
      --good: #4da66c;
      --warn: #d3a85f;
      --bad: #d06c6c;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .hybrid-insights {
      max-width: 1120px;
      margin: 0 auto;
      padding: 20px 20px 32px;
    }
    .hybrid-insights__header {
      display: grid;
      gap: 16px;
      padding: 20px 0 16px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 18px;
    }
    .hybrid-insights__header-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .hybrid-insights__header h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
    }
    .hybrid-insights__root-label {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .hybrid-insights__summary {
      margin: 8px 0 0;
      max-width: 76ch;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .hybrid-insights__toolbar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .hybrid-insights__button {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 12px;
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
    }
    .hybrid-insights__button:hover {
      border-color: color-mix(in srgb, var(--accent) 48%, transparent 52%);
      background: var(--surface-strong);
    }
    .hybrid-insights__signal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }
    .hybrid-insights__signal-card,
    .hybrid-insights__section,
    .hybrid-insights__secondary-details {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .hybrid-insights__signal-card {
      padding: 14px;
    }
    .hybrid-insights__signal-card span,
    .hybrid-insights__meta-row span {
      display: block;
      font-size: 12px;
      color: var(--muted);
    }
    .hybrid-insights__signal-card strong {
      display: block;
      margin-top: 8px;
      font-size: 24px;
      line-height: 1;
    }
    .hybrid-insights__signal-card em {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-style: normal;
      font-size: 12px;
      line-height: 1.45;
    }
    .hybrid-insights__signal-card.is-good strong {
      color: var(--good);
    }
    .hybrid-insights__signal-card.is-warn strong {
      color: var(--warn);
    }
    .hybrid-insights__signal-card.is-bad strong {
      color: var(--bad);
    }
    .hybrid-insights__secondary-details {
      overflow: hidden;
    }
    .hybrid-insights__secondary-details > summary,
    .hybrid-insights__nested-details > summary {
      cursor: pointer;
      list-style: none;
    }
    .hybrid-insights__secondary-details > summary {
      padding: 12px 14px;
      font-weight: 600;
    }
    .hybrid-insights__secondary-details > summary::-webkit-details-marker,
    .hybrid-insights__nested-details > summary::-webkit-details-marker,
    .hybrid-insights__recent-item > summary::-webkit-details-marker {
      display: none;
    }
    .hybrid-insights__secondary-details-body {
      padding: 0 14px 14px;
    }
    .hybrid-insights__sections {
      display: grid;
      gap: 14px;
      margin-top: 18px;
    }
    .hybrid-insights__section {
      padding: 16px;
    }
    .hybrid-insights__section h2 {
      margin: 0;
      font-size: 18px;
    }
    .hybrid-insights__section-intro {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .hybrid-insights__columns,
    .hybrid-insights__overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }
    .hybrid-insights__panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-muted);
      padding: 14px;
    }
    .hybrid-insights__panel h3 {
      margin: 0 0 10px;
      font-size: 15px;
    }
    .hybrid-insights__list {
      display: grid;
      gap: 8px;
    }
    .hybrid-insights__list-row,
    .hybrid-insights__meta-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
    }
    .hybrid-insights__meta-row {
      display: grid;
      gap: 6px;
      align-items: start;
    }
    .hybrid-insights__list-row:last-child,
    .hybrid-insights__meta-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .hybrid-insights__list-row span {
      color: var(--muted);
    }
    .hybrid-insights__list-row strong,
    .hybrid-insights__meta-row strong {
      font-size: 13px;
    }
    .hybrid-insights__list-row strong {
      text-align: right;
    }
    .hybrid-insights__meta-row strong {
      text-align: left;
      overflow-wrap: anywhere;
      line-height: 1.45;
    }
    .hybrid-insights__empty {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }
    .hybrid-insights__stack {
      display: grid;
      gap: 8px;
    }
    .hybrid-insights__note {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-muted);
      font-size: 13px;
      line-height: 1.5;
    }
    .hybrid-insights__status-row,
    .hybrid-insights__chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .hybrid-insights__status,
    .hybrid-insights__chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      background: var(--surface);
      font-size: 12px;
    }
    .hybrid-insights__status.is-good {
      color: var(--good);
      border-color: color-mix(in srgb, var(--good) 32%, transparent 68%);
    }
    .hybrid-insights__status.is-warn,
    .hybrid-insights__chip {
      color: var(--warn);
      border-color: color-mix(in srgb, var(--warn) 32%, transparent 68%);
    }
    .hybrid-insights__status.is-bad {
      color: var(--bad);
      border-color: color-mix(in srgb, var(--bad) 32%, transparent 68%);
    }
    .hybrid-insights__diagnostic-grid {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }
    .hybrid-insights__diagnostic-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-muted);
      padding: 14px;
    }
    .hybrid-insights__diagnostic-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .hybrid-insights__diagnostic-head h3 {
      margin: 0;
      font-size: 15px;
    }
    .hybrid-insights__diagnostic-head p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .hybrid-insights__diagnostic-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .hybrid-insights__diagnostic-stats div {
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
    }
    .hybrid-insights__diagnostic-stats span {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }
    .hybrid-insights__diagnostic-stats strong {
      display: block;
      margin-top: 6px;
      font-size: 18px;
    }
    .hybrid-insights__diagnostic-columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .hybrid-insights__diagnostic-columns h4 {
      margin: 0 0 8px;
      font-size: 13px;
    }
    .hybrid-insights__recent {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }
    .hybrid-insights__recent-item {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface-muted);
      overflow: hidden;
    }
    .hybrid-insights__recent-item > summary {
      cursor: pointer;
      list-style: none;
      padding: 12px 14px;
    }
    .hybrid-insights__recent-summary-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .hybrid-insights__recent-primary,
    .hybrid-insights__recent-secondary {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .hybrid-insights__recent-secondary {
      color: var(--muted);
      font-size: 12px;
      justify-content: flex-end;
    }
    .hybrid-insights__recent-body {
      padding: 0 14px 14px;
      display: grid;
      gap: 12px;
    }
    .hybrid-insights__recent-summary {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .hybrid-insights__meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }
    .hybrid-insights__nested-details {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
    }
    .hybrid-insights__nested-details > summary {
      padding: 10px 12px;
      font-weight: 600;
    }
    .hybrid-insights__code {
      margin: 0;
      padding: 0 12px 12px;
      background: transparent;
      color: var(--ink);
      font-size: 12px;
      overflow-x: auto;
    }
    @media (max-width: 720px) {
      .hybrid-insights {
        padding: 16px 14px 28px;
      }
      .hybrid-insights__header {
        padding-top: 8px;
      }
      .hybrid-insights__header h1 {
        font-size: 24px;
      }
      .hybrid-insights__summary {
        font-size: 13px;
      }
      .hybrid-insights__signal-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .hybrid-insights__recent-summary-row,
      .hybrid-insights__diagnostic-head {
        flex-direction: column;
      }
      .hybrid-insights__recent-secondary {
        justify-content: flex-start;
      }
      .hybrid-insights__meta-grid,
      .hybrid-insights__diagnostic-columns,
      .hybrid-insights__columns,
      .hybrid-insights__overview-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="hybrid-insights">
    <header class="hybrid-insights__header">
      <div class="hybrid-insights__header-row">
        <div>
          <h1>Hybrid Assist Insights</h1>
          <p class="hybrid-insights__root-label">Shared runtime report for <strong>${escapeHtml(rootLabel)}</strong></p>
          <p class="hybrid-insights__summary">
            Start with operator signals first, then inspect provider mix, recent runs, and flow diagnostics. Estimates stay available, but secondary.
          </p>
        </div>
        <div class="hybrid-insights__toolbar">
          <button class="hybrid-insights__button" type="button" data-action="refresh-report">Refresh</button>
          <button class="hybrid-insights__button" type="button" data-action="open-source-log" data-source="audit">Open audit log</button>
          <button class="hybrid-insights__button" type="button" data-action="open-source-log" data-source="measurement">Open measurement log</button>
        </div>
      </div>
      <div class="hybrid-insights__signal-grid">
        ${renderSignalCards(signalCards)}
      </div>
      <details class="hybrid-insights__secondary-details">
        <summary>Report source and window</summary>
        <div class="hybrid-insights__secondary-details-body">
          <div class="hybrid-insights__meta-grid">
            <div class="hybrid-insights__meta-row"><span>Generated</span><strong>${escapeHtml(formatReadableDateTime(report.generated_at, "unknown"))}</strong></div>
            <div class="hybrid-insights__meta-row"><span>Audit log</span><strong>${escapeHtml(asString(sources.audit_log, "n/a"))}</strong></div>
            <div class="hybrid-insights__meta-row"><span>Measurement log</span><strong>${escapeHtml(asString(sources.measurement_log, "n/a"))}</strong></div>
            <div class="hybrid-insights__meta-row"><span>Window</span><strong>${asNumber(limits.window_days, 0)} day(s)</strong></div>
            <div class="hybrid-insights__meta-row"><span>Recent runs shown</span><strong>${asNumber(limits.recent_limit, 0)}</strong></div>
            <div class="hybrid-insights__meta-row"><span>Total measured runs</span><strong>${asNumber(totals.runs, 0)}</strong></div>
          </div>
        </div>
      </details>
    </header>

    <div class="hybrid-insights__sections">
      <section class="hybrid-insights__section">
        <h2>Overview</h2>
        <p class="hybrid-insights__section-intro">Measured counters stay primary. Use this section to decide whether the current portfolio looks healthy enough to trust without opening raw logs.</p>
        <div class="hybrid-insights__overview-grid">
          <div class="hybrid-insights__panel">
            <h3>Current posture</h3>
            ${renderHealthSummary(derived.health_summary)}
            ${reportFlags.length ? `<div class="hybrid-insights__status-row">${reportFlags
              .map((flag) => `<span class="hybrid-insights__status is-warn">${escapeHtml(flag)}</span>`)
              .join("")}</div>` : ""}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Measured totals</h3>
            ${renderCountMap(
              {
                "Total runs": asNumber(totals.runs, 0),
                "Local runs": asNumber(totals.local_runs, 0),
                "Remote runs": remoteRuns,
                "Deterministic runs": deterministicRuns,
                "Fallback runs": asNumber(totals.fallback_runs, 0),
                "Direct codex runs": directCodexRuns,
                "Degraded runs": asNumber(totals.degraded_runs, 0),
                "Review recommended": asNumber(totals.review_recommended_runs, 0)
              },
              "No measured totals available."
            )}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Recent result distribution</h3>
            ${renderCountMap(asCountMap(measured.recent_result_distribution), "No recent results inside the bounded window.")}
          </div>
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Efficiency Recommendations</h2>
        <p class="hybrid-insights__section-intro">These panels translate the raw audit and measurement logs into immediate cost and efficiency signals tied to the new runtime behaviors.</p>
        <div class="hybrid-insights__columns">
          ${buildCacheRecommendation(recentRuns, executionPaths)}
          ${buildPreclassificationRecommendation(recentRuns, executionPaths)}
          ${buildProfileDowngradeRecommendation(recentRuns)}
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Where It Breaks Down</h2>
        <p class="hybrid-insights__section-intro">These deterministic summaries explain what is driving pressure now, without giving estimates the same weight as measured outcomes.</p>
        <div class="hybrid-insights__columns">
          <div class="hybrid-insights__panel">
            <h3>Usage by flow</h3>
            ${renderCountMap(asCountMap(measured.runs_by_flow), "No hybrid assist usage recorded yet.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Provider mix</h3>
            ${renderRankedItems(derived.dispatch_split, "No dispatch split available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Execution paths</h3>
            ${renderRankedItems(derived.execution_path_split, "No execution-path split available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Providers requested</h3>
            ${renderCountMap(asCountMap(measured.backend_requested), "No backend request data available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Providers used</h3>
            ${renderCountMap(asCountMap(measured.backend_used), "No backend usage data available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Top degraded reasons</h3>
            ${renderRankedItems(derived.top_degraded_reasons, "No degraded reasons were recorded.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Top fallback reasons</h3>
            ${renderRankedItems(derived.top_fallback_reasons, "No fallback reasons were recorded.")}
          </div>
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Recent Runs</h2>
        <p class="hybrid-insights__section-intro">Start here when something looks wrong. Each entry keeps status, backend path, and validated summary visible before any raw excerpt.</p>
        ${renderRecentRuns(recentRuns)}
      </section>

      <section class="hybrid-insights__section">
        <h2>Flow Diagnostics</h2>
        <p class="hybrid-insights__section-intro">Per-flow summaries stay compact: volume, pressure, and backend split without repeating the full report structure for every card.</p>
        ${renderFlowBreakdown(measured.flow_breakdown)}
      </section>

      <section class="hybrid-insights__section">
        <details class="hybrid-insights__secondary-details">
          <summary>Estimated ROI Proxies</summary>
          <div class="hybrid-insights__secondary-details-body">
            <p class="hybrid-insights__section-intro">These figures are estimates only. Use them for trend review, not billing claims or primary health decisions.</p>
            <div class="hybrid-insights__columns">
              <div class="hybrid-insights__panel">
                <h3>Estimated proxies</h3>
                ${renderCountMap(
                  {
                    "Remote dispatches avoided": asNumber(proxies.estimated_remote_dispatches_avoided, 0),
                    "Remote token avoidance": asNumber(proxies.estimated_remote_token_avoidance, 0)
                  },
                  "No estimate recorded."
                )}
              </div>
              <div class="hybrid-insights__panel">
                <h3>Assumptions</h3>
                ${renderCountMap(
                  {
                    "Remote tokens per local run": asNumber(assumptions.remote_tokens_per_local_run, 0)
                  },
                  "No numeric assumptions recorded."
                )}
                <p class="hybrid-insights__section-intro">${escapeHtml(asString(assumptions.token_avoidance_note, "No token avoidance note recorded."))}</p>
                <p class="hybrid-insights__section-intro">${escapeHtml(asString(assumptions.interpretation_note, "No interpretation note recorded."))}</p>
              </div>
            </div>
          </div>
        </details>
      </section>
    </div>
  </main>
  <script nonce="${nonce}">
    (() => {
      const vscode = acquireVsCodeApi();
      document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", () => {
          const type = button.getAttribute("data-action");
          const source = button.getAttribute("data-source");
          vscode.postMessage({ type, source });
        });
      });
    })();
  </script>
</body>
</html>`;
}
