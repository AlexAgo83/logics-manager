import { escapeHtml, formatCount, formatPercent } from "./insightsFormat";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

export type PieChartSpec = {
  title: string;
  description: string;
  slices: PieSlice[];
  totalLabel: string;
};

export function renderList(items: Array<{ label: string; value: string; hint?: string }>, emptyLabel: string): string {
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

export function renderStatCard(label: string, value: string, hint: string, tone: "neutral" | "good" | "warn" | "bad" = "neutral"): string {
  return `
    <section class="logics-insights__card logics-insights__card--${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <em>${escapeHtml(hint)}</em>
    </section>
  `;
}

export function buildPieSlices(entries: Array<[string, number]>): PieSlice[] {
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

export function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

export function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
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

export function renderPieChart(spec: PieChartSpec): string {
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
