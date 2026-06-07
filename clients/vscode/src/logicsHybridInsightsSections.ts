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

function renderRecommendationCard(title: string, summary: string, details: string[], emptyLabel: string): string {
  return `
    <div class="hybrid-insights__panel">
      <h3>${escapeHtml(title)}</h3>
      <p class="hybrid-insights__section-intro">${escapeHtml(summary)}</p>
      ${
        details.length
          ? `<div class="hybrid-insights__stack">${details
              .map((detail) => `<div class="hybrid-insights__note">${escapeHtml(detail)}</div>`)
              .join("")}</div>`
          : `<p class="hybrid-insights__empty">${escapeHtml(emptyLabel)}</p>`
      }
    </div>
  `;
}

type SignalCard = {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "good" | "warn" | "bad";
};

function getRecentRuns(report: Record<string, unknown>, derived: Record<string, unknown>): Record<string, unknown>[] {
  const topLevelRuns = asArray<Record<string, unknown>>(report.recent_runs);
  if (topLevelRuns.length > 0) {
    return topLevelRuns;
  }
  return asArray<Record<string, unknown>>(derived.recent_runs);
}

function buildCacheRecommendation(recentRuns: Record<string, unknown>[], executionPaths: CountMap): string {
  const cacheHitsByFlow: CountMap = {};
  const liveRunsByFlow: CountMap = {};
  for (const run of recentRuns) {
    const flow = asString(run.flow, "unknown-flow");
    const executionPath = asString(run.execution_path, "unknown");
    if (executionPath === "cache-hit") {
      cacheHitsByFlow[flow] = (cacheHitsByFlow[flow] ?? 0) + 1;
      continue;
    }
    if (executionPath !== "deterministic-preclassified") {
      liveRunsByFlow[flow] = (liveRunsByFlow[flow] ?? 0) + 1;
    }
  }

  const details = Array.from(new Set([...Object.keys(cacheHitsByFlow), ...Object.keys(liveRunsByFlow)]))
    .map((flow) => {
      const cacheHits = cacheHitsByFlow[flow] ?? 0;
      const repeatOpportunities = Math.max(0, (liveRunsByFlow[flow] ?? 0) - 1);
      return { flow, cacheHits, repeatOpportunities };
    })
    .filter((entry) => entry.cacheHits > 0 || entry.repeatOpportunities > 0)
    .sort((left, right) => (right.cacheHits + right.repeatOpportunities) - (left.cacheHits + left.repeatOpportunities))
    .slice(0, 4)
    .map(
      (entry) =>
        `${entry.flow}: ${entry.cacheHits} cache hit(s), ${entry.repeatOpportunities} recent repeat call(s) still ran live.`
    );

  const totalCacheHits = executionPaths["cache-hit"] ?? 0;
  const totalRepeatOpportunities = Object.values(liveRunsByFlow).reduce(
    (sum, count) => sum + Math.max(0, count - 1),
    0
  );
  const summary =
    totalCacheHits > 0 || totalRepeatOpportunities > 0
      ? `${totalCacheHits} cache hit(s) already served repeat work. ${totalRepeatOpportunities} recent repeat call(s) still look cacheable.`
      : "No cache hits or repeat-call opportunities are visible in the recent window yet.";

  return renderRecommendationCard(
    "Cache Effectiveness",
    summary,
    details,
    "Run the same bounded proposal flow twice on an unchanged diff to see cache savings appear here."
  );
}

function buildPreclassificationRecommendation(recentRuns: Record<string, unknown>[], executionPaths: CountMap): string {
  const countsByFlow: CountMap = {};
  for (const run of recentRuns) {
    if (asString(run.execution_path, "unknown") !== "deterministic-preclassified") {
      continue;
    }
    const flow = asString(run.flow, "unknown-flow");
    countsByFlow[flow] = (countsByFlow[flow] ?? 0) + 1;
  }
  const details = Object.entries(countsByFlow)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([flow, count]) => `${flow}: ${count} deterministic pre-classification(s) skipped an AI dispatch.`);
  const totalPreclassified = executionPaths["deterministic-preclassified"] ?? 0;
  const summary =
    totalPreclassified > 0
      ? `${totalPreclassified} recent run(s) were resolved deterministically before any AI backend call.`
      : "No deterministic pre-classification events have been observed yet.";

  return renderRecommendationCard(
    "Deterministic Pre-Classification",
    summary,
    details,
    "Lock-file-only, empty, or schema-heavy diffs will surface here once the bounded risk flows exercise the pre-classifier."
  );
}

function buildProfileDowngradeRecommendation(recentRuns: Record<string, unknown>[]): string {
  const countsByProvider: CountMap = {};
  let totalDowngrades = 0;
  for (const run of recentRuns) {
    const degradedReasons = asArray<string>(run.degraded_reasons);
    if (!degradedReasons.includes("profile-downgrade")) {
      continue;
    }
    totalDowngrades += 1;
    const flow = asString(run.flow, "unknown-flow");
    const backend = asString(run.backend_used, "unknown");
    const label = `${flow} via ${backend}`;
    countsByProvider[label] = (countsByProvider[label] ?? 0) + 1;
  }
  const details = Object.entries(countsByProvider)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => `${label}: ${count} deep-profile downgrade event(s) were recorded.`);
  const summary =
    totalDowngrades > 0
      ? `${totalDowngrades} deep-profile downgrade event(s) were observed on remote or Codex paths.`
      : "No automatic deep-profile downgrade has been recorded yet.";

  return renderRecommendationCard(
    "Profile Downgrade Events",
    summary,
    details,
    "Remote or Codex handoff runs without an explicit --profile deep override will appear here once they are exercised."
  );
}

function renderRecentRuns(value: unknown): string {
  const runs = asArray<Record<string, unknown>>(value)
    .map((run, index) => ({ run, index }))
    .sort((left, right) => {
      const timestampDiff = compareTimestampsDesc(left.run.recorded_at, right.run.recorded_at);
      return timestampDiff !== 0 ? timestampDiff : left.index - right.index;
    })
    .map(({ run }) => run);
  if (!runs.length) {
    return `<p class="hybrid-insights__empty">No recent hybrid assist audit entries available yet.</p>`;
  }
  return `
    <div class="hybrid-insights__recent">
      ${runs
        .map((run) => {
          const degradedReasons = asArray<string>(run.degraded_reasons);
          const validatedExcerpt = asRecord(run.validated_excerpt);
          const status = asString(run.result_status, "unknown");
          const executionPath = asString(run.execution_path, "unknown");
          const recordedAtLabel = formatReadableDateTime(run.recorded_at, "unknown time");
          const recordedAtTitle = formatAbsoluteDateTime(run.recorded_at, recordedAtLabel);
          const reviewRecommended = Boolean(run.review_recommended);
          const statusClass =
            status === "degraded" ? "is-bad" : reviewRecommended ? "is-warn" : "is-good";
          return `
            <details class="hybrid-insights__recent-item">
              <summary>
                <div class="hybrid-insights__recent-summary-row">
                  <div class="hybrid-insights__recent-primary">
                    <strong>${escapeHtml(asString(run.flow, "unknown-flow"))}</strong>
                    <span class="hybrid-insights__status ${statusClass}">${escapeHtml(status)}</span>
                  </div>
                  <div class="hybrid-insights__recent-secondary">
                    <span title="${escapeHtml(recordedAtTitle)}">${escapeHtml(recordedAtLabel)}</span>
                  </div>
                </div>
              </summary>
              <div class="hybrid-insights__recent-body">
                <p class="hybrid-insights__recent-summary">${escapeHtml(asString(run.validated_summary, "No validated summary captured."))}</p>
                <div class="hybrid-insights__meta-grid">
                  <div class="hybrid-insights__meta-row"><span>Safety class</span><strong>${escapeHtml(asString(run.safety_class, "unknown"))}</strong></div>
                  <div class="hybrid-insights__meta-row"><span>Seed ref</span><strong>${escapeHtml(asString(run.seed_ref, "none"))}</strong></div>
                  <div class="hybrid-insights__meta-row"><span>Execution path</span><strong>${escapeHtml(executionPath)}</strong></div>
                  <div class="hybrid-insights__meta-row"><span>Review</span><strong>${reviewRecommended ? "recommended" : "not flagged"}</strong></div>
                </div>
                ${
                  degradedReasons.length
                    ? `<div class="hybrid-insights__chips">${degradedReasons
                        .map((reason) => `<span class="hybrid-insights__chip">${escapeHtml(reason)}</span>`)
                        .join("")}</div>`
                    : ""
                }
                ${
                  Object.keys(validatedExcerpt).length
                    ? `<details class="hybrid-insights__nested-details">
                        <summary>Validated excerpt</summary>
                        <pre class="hybrid-insights__code">${escapeHtml(JSON.stringify(validatedExcerpt, null, 2))}</pre>
                      </details>`
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

function renderSignalCards(cards: SignalCard[]): string {
  return cards
    .map(
      (card) => `
        <section class="hybrid-insights__signal-card ${card.tone === "good" ? "is-good" : card.tone === "warn" ? "is-warn" : card.tone === "bad" ? "is-bad" : ""}">
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <em>${escapeHtml(card.hint)}</em>
        </section>
      `
    )
    .join("");
}

export {
  buildCacheRecommendation,
  buildPreclassificationRecommendation,
  buildProfileDowngradeRecommendation,
  getRecentRuns,
  renderRecentRuns,
  renderSignalCards
};

export type { SignalCard };
