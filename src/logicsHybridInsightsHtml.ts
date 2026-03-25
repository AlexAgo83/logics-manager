import * as vscode from "vscode";
import { getNonce } from "./logicsReadPreviewHtml";

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

function formatRate(value: unknown): string {
  const rate = asNumber(value, 0);
  return `${(rate * 100).toFixed(rate === 0 ? 0 : 1)}%`;
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
              <strong>${count}</strong>
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
    <div class="hybrid-insights__flow-grid">
      ${entries
        .map(([flowName, rawFlow]) => {
          const flow = asRecord(rawFlow);
          return `
            <section class="hybrid-insights__flow-card">
              <div class="hybrid-insights__flow-head">
                <h4>${escapeHtml(flowName)}</h4>
                <strong>${asNumber(flow.run_count, 0)} run(s)</strong>
              </div>
              <div class="hybrid-insights__flow-metrics">
                <span>Fallback ${formatRate(flow.fallback_rate)}</span>
                <span>Degraded ${formatRate(flow.degraded_rate)}</span>
                <span>Review ${formatRate(flow.review_recommended_rate)}</span>
              </div>
              <div class="hybrid-insights__flow-columns">
                <div>
                  <h5>Requested</h5>
                  ${renderCountMap(asCountMap(flow.backend_requested), "No requested backend data.")}
                </div>
                <div>
                  <h5>Used</h5>
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

function renderRecentRuns(value: unknown): string {
  const runs = asArray<Record<string, unknown>>(value);
  if (!runs.length) {
    return `<p class="hybrid-insights__empty">No recent hybrid assist audit entries available yet.</p>`;
  }
  return `
    <div class="hybrid-insights__recent">
      ${runs
        .map((run) => {
          const degradedReasons = asArray<string>(run.degraded_reasons);
          const validatedExcerpt = run.validated_excerpt;
          return `
            <details class="hybrid-insights__recent-item">
              <summary>
                <span class="hybrid-insights__recent-primary">
                  <strong>${escapeHtml(asString(run.flow, "unknown-flow"))}</strong>
                  <span>${escapeHtml(asString(run.result_status, "unknown"))}</span>
                </span>
                <span class="hybrid-insights__recent-secondary">
                  <span>${escapeHtml(asString(run.backend_requested, "unknown"))} -> ${escapeHtml(asString(run.backend_used, "unknown"))}</span>
                  <span>${escapeHtml(asString(run.recorded_at, "unknown time"))}</span>
                </span>
              </summary>
              <div class="hybrid-insights__recent-body">
                <div class="hybrid-insights__recent-meta">
                  <span>Safety class: ${escapeHtml(asString(run.safety_class, "unknown"))}</span>
                  <span>Seed ref: ${escapeHtml(asString(run.seed_ref, "none"))}</span>
                  <span>Review: ${Boolean(run.review_recommended) ? "recommended" : "not flagged"}</span>
                </div>
                <p class="hybrid-insights__recent-summary">${escapeHtml(asString(run.validated_summary, "No validated summary captured."))}</p>
                ${
                  degradedReasons.length
                    ? `<div class="hybrid-insights__chips">${degradedReasons
                        .map((reason) => `<span class="hybrid-insights__chip">${escapeHtml(reason)}</span>`)
                        .join("")}</div>`
                    : ""
                }
                ${
                  Object.keys(asRecord(validatedExcerpt)).length
                    ? `<pre class="hybrid-insights__code">${escapeHtml(
                        JSON.stringify(validatedExcerpt, null, 2)
                      )}</pre>`
                    : ""
                }
              </div>
            </details>
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
      --bg: #f4efe4;
      --panel: rgba(255, 252, 245, 0.9);
      --panel-strong: #fff9ef;
      --ink: #1d1d1b;
      --muted: #6a6258;
      --accent: #9d3c20;
      --accent-soft: rgba(157, 60, 32, 0.12);
      --line: rgba(77, 63, 48, 0.18);
      --good: #2f6b45;
      --warn: #9d6512;
      --bad: #9f2f2f;
      --code: #17130f;
    }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top right, rgba(157, 60, 32, 0.12), transparent 28%),
        linear-gradient(180deg, #f7f0e2 0%, #f1eadf 100%);
      color: var(--ink);
      font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
    }
    .hybrid-insights {
      max-width: 1180px;
      margin: 0 auto;
      padding: 28px 20px 40px;
    }
    .hybrid-insights__hero {
      display: grid;
      gap: 18px;
      padding: 22px;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255, 250, 242, 0.98), rgba(250, 243, 231, 0.96));
      box-shadow: 0 20px 40px rgba(53, 39, 27, 0.08);
    }
    .hybrid-insights__eyebrow {
      margin: 0;
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .hybrid-insights__title-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      flex-wrap: wrap;
    }
    .hybrid-insights__title-row h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 3.2rem);
      line-height: 0.95;
      letter-spacing: -0.04em;
    }
    .hybrid-insights__subtitle {
      margin: 8px 0 0;
      max-width: 70ch;
      color: var(--muted);
      line-height: 1.55;
      font-size: 15px;
    }
    .hybrid-insights__toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hybrid-insights__button {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 9px 14px;
      background: var(--panel-strong);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
    }
    .hybrid-insights__button:hover {
      border-color: rgba(157, 60, 32, 0.42);
      background: #fffef9;
    }
    .hybrid-insights__meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .hybrid-insights__meta-card,
    .hybrid-insights__section {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--panel);
    }
    .hybrid-insights__meta-card {
      padding: 14px 16px;
    }
    .hybrid-insights__meta-card span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .hybrid-insights__meta-card strong {
      font-size: 1rem;
      line-height: 1.35;
    }
    .hybrid-insights__sections {
      display: grid;
      gap: 18px;
      margin-top: 18px;
    }
    .hybrid-insights__section {
      padding: 18px;
    }
    .hybrid-insights__section h2 {
      margin: 0 0 6px;
      font-size: 1.35rem;
      letter-spacing: -0.02em;
    }
    .hybrid-insights__section > p {
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.5;
    }
    .hybrid-insights__grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .hybrid-insights__stat {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.54);
    }
    .hybrid-insights__stat span {
      display: block;
      font-size: 12px;
      color: var(--muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .hybrid-insights__stat strong {
      display: block;
      font-size: 2rem;
      line-height: 1;
      margin-bottom: 6px;
    }
    .hybrid-insights__stat em {
      font-style: normal;
      color: var(--muted);
      font-size: 14px;
    }
    .hybrid-insights__columns {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    .hybrid-insights__panel {
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.56);
      padding: 16px;
    }
    .hybrid-insights__panel h3,
    .hybrid-insights__flow-card h4,
    .hybrid-insights__flow-card h5 {
      margin: 0 0 10px;
    }
    .hybrid-insights__list {
      display: grid;
      gap: 10px;
    }
    .hybrid-insights__list-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--line);
    }
    .hybrid-insights__list-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .hybrid-insights__empty {
      margin: 0;
      color: var(--muted);
    }
    .hybrid-insights__stack {
      display: grid;
      gap: 10px;
    }
    .hybrid-insights__note {
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--accent-soft);
      border: 1px solid rgba(157, 60, 32, 0.18);
      line-height: 1.5;
    }
    .hybrid-insights__flow-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .hybrid-insights__flow-card {
      padding: 16px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.58);
    }
    .hybrid-insights__flow-head,
    .hybrid-insights__recent-primary,
    .hybrid-insights__recent-secondary {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      align-items: baseline;
    }
    .hybrid-insights__flow-metrics {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      color: var(--muted);
      font-size: 14px;
    }
    .hybrid-insights__flow-columns {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    .hybrid-insights__recent {
      display: grid;
      gap: 12px;
    }
    .hybrid-insights__recent-item {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.56);
      overflow: hidden;
    }
    .hybrid-insights__recent-item summary {
      cursor: pointer;
      list-style: none;
      padding: 14px 16px;
      display: grid;
      gap: 6px;
    }
    .hybrid-insights__recent-item summary::-webkit-details-marker {
      display: none;
    }
    .hybrid-insights__recent-body {
      padding: 0 16px 16px;
    }
    .hybrid-insights__recent-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 13px;
      margin-bottom: 10px;
    }
    .hybrid-insights__recent-summary {
      margin: 0 0 12px;
      line-height: 1.55;
    }
    .hybrid-insights__chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .hybrid-insights__chip {
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(159, 47, 47, 0.1);
      color: var(--bad);
      font-size: 12px;
      border: 1px solid rgba(159, 47, 47, 0.18);
    }
    .hybrid-insights__code {
      margin: 0;
      padding: 14px;
      border-radius: 14px;
      background: var(--code);
      color: #f8f0e4;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.55;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    @media (max-width: 720px) {
      .hybrid-insights {
        padding: 18px 14px 32px;
      }
      .hybrid-insights__hero,
      .hybrid-insights__section {
        padding: 16px;
      }
    }
  </style>
</head>
<body>
  <main class="hybrid-insights">
    <section class="hybrid-insights__hero">
      <p class="hybrid-insights__eyebrow">Hybrid Assist ROI Dispatch Report</p>
      <div class="hybrid-insights__title-row">
        <div>
          <h1>Hybrid Assist Insights</h1>
          <p class="hybrid-insights__subtitle">
            Shared runtime report for <strong>${escapeHtml(rootLabel)}</strong>. Measured facts stay separate from derived rates and estimated ROI proxies so fallback-heavy or degraded-heavy usage remains visible.
          </p>
        </div>
        <div class="hybrid-insights__toolbar">
          <button class="hybrid-insights__button" type="button" data-action="refresh-report">Refresh</button>
          <button class="hybrid-insights__button" type="button" data-action="open-source-log" data-source="audit">Open audit log</button>
          <button class="hybrid-insights__button" type="button" data-action="open-source-log" data-source="measurement">Open measurement log</button>
        </div>
      </div>
      <div class="hybrid-insights__meta">
        <div class="hybrid-insights__meta-card">
          <span>Generated</span>
          <strong>${escapeHtml(asString(report.generated_at, "unknown"))}</strong>
        </div>
        <div class="hybrid-insights__meta-card">
          <span>Audit Log</span>
          <strong>${escapeHtml(asString(sources.audit_log, "n/a"))}</strong>
        </div>
        <div class="hybrid-insights__meta-card">
          <span>Measurement Log</span>
          <strong>${escapeHtml(asString(sources.measurement_log, "n/a"))}</strong>
        </div>
        <div class="hybrid-insights__meta-card">
          <span>Window</span>
          <strong>${asNumber(limits.window_days, 0)} day(s), ${asNumber(limits.recent_limit, 0)} recent run(s)</strong>
        </div>
      </div>
    </section>

    <div class="hybrid-insights__sections">
      <section class="hybrid-insights__section">
        <h2>Measured Facts</h2>
        <p>These counters come directly from hybrid assist measurement records and recent audit provenance. No UI-side aggregation logic is added beyond rendering the runtime output.</p>
        <div class="hybrid-insights__grid">
          <div class="hybrid-insights__stat">
            <span>Total runs</span>
            <strong>${asNumber(totals.runs, 0)}</strong>
            <em>Measured dispatch executions</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Fallback runs</span>
            <strong>${asNumber(totals.fallback_runs, 0)}</strong>
            <em>Requested local or auto, used codex</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Degraded runs</span>
            <strong>${asNumber(totals.degraded_runs, 0)}</strong>
            <em>Runs flagged degraded by the runtime</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Review recommended</span>
            <strong>${asNumber(totals.review_recommended_runs, 0)}</strong>
            <em>Runs that still need operator attention</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Local runs</span>
            <strong>${asNumber(totals.local_runs, 0)}</strong>
            <em>Measured Ollama-backed completions</em>
          </div>
        </div>
        <div class="hybrid-insights__columns" style="margin-top: 14px;">
          <div class="hybrid-insights__panel">
            <h3>Usage by flow</h3>
            ${renderCountMap(asCountMap(measured.runs_by_flow), "No hybrid assist usage recorded yet.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Requested backends</h3>
            ${renderCountMap(asCountMap(measured.backend_requested), "No backend request data available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Backends used</h3>
            ${renderCountMap(asCountMap(measured.backend_used), "No backend usage data available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Recent result distribution</h3>
            ${renderCountMap(asCountMap(measured.recent_result_distribution), "No recent results inside the bounded window.")}
          </div>
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Derived Summaries</h2>
        <p>These summaries and rates are deterministic transformations over the measured counters, kept in the shared runtime so CLI and plugin semantics do not drift.</p>
        <div class="hybrid-insights__grid">
          <div class="hybrid-insights__stat">
            <span>Fallback rate</span>
            <strong>${formatRate(rates.fallback_rate)}</strong>
            <em>Fallback share of measured runs</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Degraded rate</span>
            <strong>${formatRate(rates.degraded_rate)}</strong>
            <em>Operational quality pressure</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Review rate</span>
            <strong>${formatRate(rates.review_recommended_rate)}</strong>
            <em>Manual review still advisable</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Local offload rate</span>
            <strong>${formatRate(rates.local_offload_rate)}</strong>
            <em>Measured local completion share</em>
          </div>
        </div>
        <div class="hybrid-insights__columns" style="margin-top: 14px;">
          <div class="hybrid-insights__panel">
            <h3>Dispatch split</h3>
            ${renderRankedItems(derived.dispatch_split, "No dispatch split available.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Top degraded reasons</h3>
            ${renderRankedItems(derived.top_degraded_reasons, "No degraded reasons were recorded.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Top fallback reasons</h3>
            ${renderRankedItems(derived.top_fallback_reasons, "No fallback reasons were recorded.")}
          </div>
          <div class="hybrid-insights__panel">
            <h3>Health summary</h3>
            ${renderHealthSummary(derived.health_summary)}
          </div>
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Estimated ROI Proxies</h2>
        <p>These figures are estimates only. They are useful for relative trend review, not for exact billing claims.</p>
        <div class="hybrid-insights__grid">
          <div class="hybrid-insights__stat">
            <span>Estimated remote dispatches avoided</span>
            <strong>${asNumber(proxies.estimated_remote_dispatches_avoided, 0)}</strong>
            <em>Based on measured local completions</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Estimated remote token avoidance</span>
            <strong>${asNumber(proxies.estimated_remote_token_avoidance, 0)}</strong>
            <em>Illustrative token proxy only</em>
          </div>
          <div class="hybrid-insights__stat">
            <span>Estimated local offload share</span>
            <strong>${formatRate(proxies.estimated_local_offload_share)}</strong>
            <em>Trend proxy, not a financial metric</em>
          </div>
        </div>
        <div class="hybrid-insights__panel" style="margin-top: 14px;">
          <h3>Assumptions</h3>
          ${renderCountMap(
            {
              "remote_tokens_per_local_run": asNumber(assumptions.remote_tokens_per_local_run, 0)
            },
            "No numeric assumptions recorded."
          )}
          <div class="hybrid-insights__stack" style="margin-top: 12px;">
            <div class="hybrid-insights__note">${escapeHtml(asString(assumptions.token_avoidance_note, "No token avoidance note recorded."))}</div>
            <div class="hybrid-insights__note">${escapeHtml(asString(assumptions.interpretation_note, "No interpretation note recorded."))}</div>
          </div>
        </div>
      </section>

      <section class="hybrid-insights__section">
        <h2>Flow Drill-Down</h2>
        <p>Per-flow summaries come directly from the runtime report. The plugin stays a renderer and does not recompute any of these rates.</p>
        ${renderFlowBreakdown(measured.flow_breakdown)}
      </section>

      <section class="hybrid-insights__section">
        <h2>Recent Audit Drill-Down</h2>
        <p>Recent runs expose backend provenance, degraded reasons, and a bounded validated excerpt so operators do not need to open raw JSONL logs for every review.</p>
        ${renderRecentRuns(report.recent_runs)}
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
