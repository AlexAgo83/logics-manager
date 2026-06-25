import { afterEach, describe, expect, it, vi } from "vitest";
import {
  asString,
  escapeHtml,
  formatCount,
  formatPercent,
  formatRelativeDate,
  formatTimelineLabel,
  getUtcIsoWeekStart,
  getUtcMonthStart,
  parseProgress,
  parseTimestamp
} from "../clients/vscode/src/insightsFormat";
import {
  buildPieSlices,
  describePieSlice,
  polarToCartesian,
  renderList,
  renderPieChart,
  renderStatCard
} from "../clients/vscode/src/insightsCharts";

describe("insightsFormat helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("escapeHtml", () => {
    it("escapes all five reserved characters", () => {
      expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
    });

    it("escapes ampersands before angle brackets", () => {
      expect(escapeHtml("<a>&")).toBe("&lt;a&gt;&amp;");
    });

    it("returns plain text unchanged", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });
  });

  describe("asString", () => {
    it("trims and returns non-empty strings", () => {
      expect(asString("  hi  ")).toBe("hi");
    });

    it("returns the fallback for blank strings", () => {
      expect(asString("   ")).toBe("n/a");
      expect(asString("", "missing")).toBe("missing");
    });

    it("returns the fallback for non-string values", () => {
      expect(asString(42)).toBe("n/a");
      expect(asString(null, "none")).toBe("none");
      expect(asString(undefined, "none")).toBe("none");
    });
  });

  describe("parseTimestamp", () => {
    it("parses an ISO date string", () => {
      expect(parseTimestamp("2026-01-01T00:00:00.000Z")).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
    });

    it("returns null for blank or non-string input", () => {
      expect(parseTimestamp("")).toBeNull();
      expect(parseTimestamp("   ")).toBeNull();
      expect(parseTimestamp(123)).toBeNull();
    });

    it("returns null for an unparseable string", () => {
      expect(parseTimestamp("not-a-date")).toBeNull();
    });

    it("parses space-separated and over-precise timestamps (shared robust impl)", () => {
      expect(parseTimestamp("2026-01-01 12:00:00")).toBe(Date.parse("2026-01-01T12:00:00"));
      expect(parseTimestamp("2026-01-01T00:00:00.123456Z")).toBe(Date.parse("2026-01-01T00:00:00.123Z"));
    });
  });

  describe("formatRelativeDate", () => {
    it("returns 'just now' for the current instant", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
      expect(formatRelativeDate("2026-06-20T12:00:00.000Z")).toBe("just now");
    });

    it("returns minutes ago for recent times", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-20T12:30:00.000Z"));
      expect(formatRelativeDate("2026-06-20T12:00:00.000Z")).toBe("30 min ago");
    });

    it("returns hours ago with pluralization", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));
      expect(formatRelativeDate("2026-06-20T11:00:00.000Z")).toBe("1 hr ago");
      expect(formatRelativeDate("2026-06-20T09:00:00.000Z")).toBe("3 hrs ago");
    });

    it("falls back to the raw value when not parseable", () => {
      expect(formatRelativeDate("not-a-date")).toBe("not-a-date");
      expect(formatRelativeDate("", "unknown")).toBe("unknown");
    });
  });

  describe("formatPercent", () => {
    it("rounds a ratio to a whole percentage", () => {
      expect(formatPercent(0)).toBe("0%");
      expect(formatPercent(0.5)).toBe("50%");
      expect(formatPercent(1)).toBe("100%");
      expect(formatPercent(0.333)).toBe("33%");
    });
  });

  describe("formatCount", () => {
    it("renders integers without decimals", () => {
      expect(formatCount(5)).toBe("5");
    });

    it("renders fractional values with one decimal", () => {
      expect(formatCount(5.2)).toBe("5.2");
      expect(formatCount(2.5)).toBe("2.5");
    });
  });

  describe("parseProgress", () => {
    it("extracts a clamped percentage", () => {
      expect(parseProgress("50%")).toBe(50);
      expect(parseProgress("0")).toBe(0);
      expect(parseProgress("100")).toBe(100);
      expect(parseProgress("250")).toBe(100);
    });

    it("returns null for missing or non-numeric input", () => {
      expect(parseProgress(undefined)).toBeNull();
      expect(parseProgress("")).toBeNull();
      expect(parseProgress("none")).toBeNull();
    });
  });

  describe("getUtcIsoWeekStart", () => {
    it("returns the Monday 00:00 UTC for a mid-week timestamp", () => {
      // 2026-06-20 is a Saturday
      const start = getUtcIsoWeekStart(Date.parse("2026-06-20T15:00:00.000Z"));
      expect(new Date(start).toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });

    it("treats Monday as the start of its own week", () => {
      const start = getUtcIsoWeekStart(Date.parse("2026-06-15T08:00:00.000Z"));
      expect(new Date(start).toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });

    it("treats Sunday as the end of the previous week", () => {
      const start = getUtcIsoWeekStart(Date.parse("2026-06-21T08:00:00.000Z"));
      expect(new Date(start).toISOString()).toBe("2026-06-15T00:00:00.000Z");
    });
  });

  describe("getUtcMonthStart", () => {
    it("returns the first of the month at 00:00 UTC", () => {
      const start = getUtcMonthStart(Date.parse("2026-06-20T15:00:00.000Z"));
      expect(new Date(start).toISOString()).toBe("2026-06-01T00:00:00.000Z");
    });
  });

  describe("formatTimelineLabel", () => {
    it("formats a full month/day label in UTC", () => {
      expect(formatTimelineLabel(Date.parse("2026-06-20T00:00:00.000Z"))).toBe("Jun 20");
    });

    it("formats a compact label with the month initial", () => {
      expect(formatTimelineLabel(Date.parse("2026-06-20T00:00:00.000Z"), true)).toBe("J20");
    });
  });
});

describe("insightsCharts helpers", () => {
  describe("polarToCartesian", () => {
    it("places 0 degrees at the top of the circle", () => {
      const point = polarToCartesian(60, 60, 48, 0);
      expect(point.x).toBeCloseTo(60, 6);
      expect(point.y).toBeCloseTo(12, 6);
    });

    it("places 90 degrees to the right", () => {
      const point = polarToCartesian(60, 60, 48, 90);
      expect(point.x).toBeCloseTo(108, 6);
      expect(point.y).toBeCloseTo(60, 6);
    });

    it("places 180 degrees at the bottom", () => {
      const point = polarToCartesian(60, 60, 48, 180);
      expect(point.x).toBeCloseTo(60, 6);
      expect(point.y).toBeCloseTo(108, 6);
    });
  });

  describe("describePieSlice", () => {
    it("builds an SVG path with the small-arc flag for slices <= 180 degrees", () => {
      const path = describePieSlice(60, 60, 48, 0, 90);
      expect(path).toBe("M 60 60 L 108.000 60.000 A 48 48 0 0 0 60.000 12.000 Z");
    });

    it("uses the large-arc flag for slices > 180 degrees", () => {
      const path = describePieSlice(60, 60, 48, 0, 270);
      expect(path).toContain("A 48 48 0 1 0");
    });
  });

  describe("buildPieSlices", () => {
    it("drops zero-value entries and assigns palette colors", () => {
      const slices = buildPieSlices([
        ["a", 3],
        ["b", 0],
        ["c", 5]
      ]);
      expect(slices).toEqual([
        { label: "a", value: 3, color: "var(--vscode-terminal-ansiBlue)" },
        { label: "c", value: 5, color: "var(--vscode-terminal-ansiGreen)" }
      ]);
    });

    it("cycles the palette beyond six entries", () => {
      const slices = buildPieSlices(
        Array.from({ length: 7 }, (_, index) => [`s${index}`, 1] as [string, number])
      );
      expect(slices[6].color).toBe(slices[0].color);
    });
  });

  describe("renderList", () => {
    it("renders the empty label when there are no items", () => {
      expect(renderList([], "Nothing <here>")).toBe(
        '<p class="logics-insights__empty">Nothing &lt;here&gt;</p>'
      );
    });

    it("escapes labels, values and hints", () => {
      const html = renderList([{ label: "a&b", value: "1<2", hint: "x>y" }], "empty");
      expect(html).toContain("a&amp;b");
      expect(html).toContain("1&lt;2");
      expect(html).toContain("x&gt;y");
    });

    it("omits the hint span when no hint is provided", () => {
      const html = renderList([{ label: "a", value: "1" }], "empty");
      expect(html).not.toContain("<span>");
    });
  });

  describe("renderStatCard", () => {
    it("applies the tone modifier class and escapes content", () => {
      const html = renderStatCard("L&L", "5", "hint", "warn");
      expect(html).toContain("logics-insights__card--warn");
      expect(html).toContain("L&amp;L");
    });

    it("defaults to the neutral tone", () => {
      const html = renderStatCard("L", "5", "hint");
      expect(html).toContain("logics-insights__card--neutral");
    });
  });

  describe("renderPieChart", () => {
    it("renders the no-data state when the total is zero", () => {
      const html = renderPieChart({ title: "T", description: "D", slices: [], totalLabel: "docs" });
      expect(html).toContain("No data available.");
      expect(html).not.toContain("<svg");
    });

    it("renders a single full circle for a one-slice chart", () => {
      const html = renderPieChart({
        title: "T",
        description: "D",
        slices: [{ label: "only", value: 4, color: "red" }],
        totalLabel: "docs"
      });
      expect(html).toContain('<circle cx="60" cy="60" r="48" fill="red"></circle>');
      expect(html).toContain("100%");
    });

    it("renders path segments for multi-slice charts", () => {
      const html = renderPieChart({
        title: "T",
        description: "D",
        slices: [
          { label: "a", value: 1, color: "red" },
          { label: "b", value: 3, color: "blue" }
        ],
        totalLabel: "docs"
      });
      expect(html).toContain('<path d="M 60 60');
      expect(html).toContain("25%");
      expect(html).toContain("75%");
    });
  });
});
