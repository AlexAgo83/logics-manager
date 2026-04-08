import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";
import { LogicsItem, compareStages } from "./logicsIndexer";

type CountMap = Record<string, number>;

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
          padding: 8px 12px;
          cursor: pointer;
        }
        .logics-insights__button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
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
        @media (max-width: 920px) {
          .logics-insights__header {
            flex-direction: column;
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
      </main>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.querySelector('[data-action="refresh-report"]')?.addEventListener('click', () => {
          vscode.postMessage({ type: 'refresh-report' });
        });
      </script>
    </body>
  </html>`;
}
