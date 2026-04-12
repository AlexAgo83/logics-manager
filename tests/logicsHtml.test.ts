import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

vi.mock("vscode", () => ({
  Uri: {
    file: (value: string) => {
      const normalized = toPosixPath(value);
      return { fsPath: value, path: normalized, toString: () => normalized };
    },
    joinPath: (base: { fsPath?: string; path?: string }, ...segments: string[]) => {
      const basePath = toPosixPath(base.path ?? base.fsPath ?? "");
      const joined = path.posix.join(basePath, ...segments.map(toPosixPath));
      return {
        fsPath: joined,
        path: joined,
        toString: () => joined
      };
    }
  }
}));

import * as vscode from "vscode";
import { buildLogicsCorpusInsightsHtml } from "../src/logicsCorpusInsightsHtml";
import { buildHybridInsightsHtml } from "../src/logicsHybridInsightsHtml";
import { buildReadPreviewHtml } from "../src/logicsReadPreviewHtml";
import { buildLogicsWebviewHtml } from "../src/logicsWebviewHtml";

type WebviewLike = {
  cspSource: string;
  asWebviewUri: (uri: { fsPath?: string; path?: string; toString?: () => string }) => { toString: () => string };
};

function createWebview(): WebviewLike {
  return {
    cspSource: "webview-csp",
    asWebviewUri: (uri) => ({
      toString: () => `webview:${toPosixPath(String(uri.path ?? uri.fsPath ?? uri.toString?.() ?? ""))}`
    })
  };
}

describe("logics HTML builders", () => {
  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
  const realDateTimeFormat = Intl.DateTimeFormat;
  let dateTimeFormatSpy: ReturnType<typeof vi.spyOn<typeof Intl, "DateTimeFormat">> | null = null;

  afterEach(() => {
    dateTimeFormatSpy?.mockRestore();
    dateTimeFormatSpy = null;
    randomSpy.mockClear();
    vi.useRealTimers();
  });

  it("renders the hybrid insights report snapshot", () => {
    dateTimeFormatSpy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      (function mockDateTimeFormat(
        _: Intl.LocalesArgument,
        options?: Intl.DateTimeFormatOptions
      ) {
        return new realDateTimeFormat("en-US", {
          ...options,
          timeZone: "Europe/Paris"
        });
      }) as typeof Intl.DateTimeFormat
    );

    const html = buildHybridInsightsHtml({
      webview: createWebview() as never,
      rootLabel: "/workspace/project",
      report: {
        measured: {
          totals: {
            runs: 10,
            local_runs: 7,
            fallback_runs: 2,
            degraded_runs: 1,
            review_recommended_runs: 3
          },
          execution_paths: {
            local: 7,
            fallback: 2,
            remote: 1
          }
        },
        derived: {
          rates: {
            local_offload_rate: 0.7,
            fallback_rate: 0.2,
            degraded_rate: 0.1,
            review_recommended_rate: 0.3
          },
          report_state: {
            fallback_heavy: false,
            degraded_heavy: true,
            review_heavy: false
          },
          health_summary: ["Ollama healthy on most runs.", "Codex fallback only triggered twice."],
          top_degraded_reasons: [{ label: "ollama-timeout", count: 1 }],
          top_review_flows: [{ label: "commit-all", count: 2 }],
          execution_path_split: [
            { label: "local", count: 7 },
            { label: "fallback", count: 2 },
            { label: "remote", count: 1 }
          ],
          flow_breakdown: {
            "commit-all": {
              run_count: 3,
              fallback_rate: 0.33,
              degraded_rate: 0,
              review_recommended_rate: 0.66,
              backend_requested: { auto: 3 },
              backend_used: { ollama: 2, codex: 1 },
              execution_paths: { local: 2, fallback: 1 }
            }
          }
        },
        recent_runs: [
          {
            flow: "commit-all",
            result_status: "degraded",
            backend_requested: "auto",
            backend_used: "codex",
            execution_path: "fallback",
            recorded_at: "2026-04-04T10:00:00Z",
            validated_summary: "Fallback completed with review recommendation.",
            safety_class: "review",
            seed_ref: "task_110",
            review_recommended: true,
            degraded_reasons: ["ollama-timeout"],
            validated_excerpt: {
              summary: "Fallback completed."
            }
          }
        ],
        estimated: {
          assumptions: {
            hourly_rate_usd: 120
          },
          proxies: {
            time_saved_minutes: 42
          }
        },
        sources: {
          audit_log: "logics/.cache/hybrid_assist_audit.jsonl",
          measurement_log: "logics/.cache/hybrid_assist_measurements.jsonl"
        },
        limits: {
          measurement_sample_size: 9
        }
      }
    });

    expect(html).toMatchSnapshot();
  });

  it("renders the logics corpus insights summary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));
    const html = buildLogicsCorpusInsightsHtml({
      webview: createWebview() as never,
      root: "/workspace/project",
      items: [
        {
          id: "req_001_example",
          title: "Example request",
          stage: "request",
          path: "/workspace/project/logics/request/req_001_example.md",
          relPath: "logics/request/req_001_example.md",
          filename: "req_001_example.md",
          updatedAt: "2026-04-08T10:00:00Z",
          indicators: {},
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 48,
          charCount: 1200,
          isPromoted: false,
          references: [{ kind: "manual", label: "Reference", path: "logics/backlog/item_001_example.md" }],
          usedBy: []
        },
        {
          id: "item_001_example",
          title: "Example backlog item",
          stage: "backlog",
          path: "/workspace/project/logics/backlog/item_001_example.md",
          relPath: "logics/backlog/item_001_example.md",
          filename: "item_001_example.md",
          updatedAt: "2026-04-08T09:00:00Z",
          indicators: { Progress: "100%" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 72,
          charCount: 1600,
          isPromoted: false,
          references: [],
          usedBy: [{ id: "req_001_example", title: "Example request", stage: "request", relPath: "logics/request/req_001_example.md" }]
        },
        {
          id: "req_002_closed_this_week",
          title: "Closed this week request",
          stage: "request",
          path: "/workspace/project/logics/request/req_002_closed_this_week.md",
          relPath: "logics/request/req_002_closed_this_week.md",
          filename: "req_002_closed_this_week.md",
          updatedAt: "2026-04-07T10:00:00Z",
          indicators: { Status: "Done" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 42,
          charCount: 1000,
          isPromoted: false,
          references: [],
          usedBy: []
        },
        {
          id: "item_002_closed_this_month",
          title: "Closed this month backlog item",
          stage: "backlog",
          path: "/workspace/project/logics/backlog/item_002_closed_this_month.md",
          relPath: "logics/backlog/item_002_closed_this_month.md",
          filename: "item_002_closed_this_month.md",
          updatedAt: "2026-04-02T10:00:00Z",
          indicators: { Status: "Archived" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 60,
          charCount: 1300,
          isPromoted: false,
          references: [],
          usedBy: []
        },
        {
          id: "task_002_closed_this_month",
          title: "Closed this month task",
          stage: "task",
          path: "/workspace/project/logics/tasks/task_002_closed_this_month.md",
          relPath: "logics/tasks/task_002_closed_this_month.md",
          filename: "task_002_closed_this_month.md",
          updatedAt: "2026-04-03T10:00:00Z",
          indicators: { Status: "Obsolete" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 90,
          charCount: 1700,
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    });

    expect(html).toContain("Logics Insights");
    expect(html).toContain("Managed docs");
    expect(html).toContain("Generated INDEX.md");
    expect(html).toContain("missing");
    expect(html).toContain("Velocity");
    expect(html).toContain("Closed this week");
    expect(html).toContain("Closed this month");
    expect(html).toContain("Corpus explorer");
    expect(html).toContain("Relationship map");
    expect(html).toContain("Delivery timeline");
    expect(html).toContain("data-explorer-view=\"map\"");
    expect(html).toContain("data-explorer-view=\"timeline\"");
    expect(html).toContain("Week");
    expect(html).toContain("Day");
    expect(html).toContain("A6");
    expect(html).toContain("Done, Archived, Obsolete");
    expect(html).toContain("Distribution snapshots");
    expect(html).toContain("Status distribution");
    expect(html).toContain("Theme distribution");
    expect(html).toContain("Understanding distribution");
    expect(html).toContain("Confidence distribution");
    expect(html).toContain("Requests without backlog");
    expect(html).toContain("Stale open items");
    expect(html).toContain("Getting Started");
    expect(html).toContain("data-action=\"open-onboarding\"");
    expect(html).toContain("data-action=\"about\"");
    expect(html).toContain("<svg viewBox=\"0 0 120 120\"");
  });

  it("renders the expanded insights sections and timeline period toggles", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));
    const html = buildLogicsCorpusInsightsHtml({
      webview: createWebview() as never,
      root: "/workspace/project",
      items: [
        {
          id: "req_010_stale_navigation",
          title: "Stale navigation request",
          stage: "request",
          path: "/workspace/project/logics/request/req_010_stale_navigation.md",
          relPath: "logics/request/req_010_stale_navigation.md",
          filename: "req_010_stale_navigation.md",
          updatedAt: "2026-02-01T10:00:00Z",
          indicators: { Status: "Draft", Theme: "Navigation", Understanding: "95%", Confidence: "88%" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 48,
          charCount: 1200,
          isPromoted: false,
          references: [],
          usedBy: []
        },
        {
          id: "req_011_open_request",
          title: "Open request without backlog",
          stage: "request",
          path: "/workspace/project/logics/request/req_011_open_request.md",
          relPath: "logics/request/req_011_open_request.md",
          filename: "req_011_open_request.md",
          updatedAt: "2026-04-06T10:00:00Z",
          indicators: { Status: "Ready", Theme: "Navigation", Understanding: "68%", Confidence: "62%" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 44,
          charCount: 1100,
          isPromoted: false,
          references: [],
          usedBy: []
        },
        {
          id: "item_010_blocked",
          title: "Blocked backlog item",
          stage: "backlog",
          path: "/workspace/project/logics/backlog/item_010_blocked.md",
          relPath: "logics/backlog/item_010_blocked.md",
          filename: "item_010_blocked.md",
          updatedAt: "2026-02-15T10:00:00Z",
          indicators: { Status: "Blocked", Progress: "45%" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 62,
          charCount: 1500,
          isPromoted: false,
          references: [],
          usedBy: []
        },
        {
          id: "task_010_in_progress",
          title: "In progress task",
          stage: "task",
          path: "/workspace/project/logics/tasks/task_010_in_progress.md",
          relPath: "logics/tasks/task_010_in_progress.md",
          filename: "task_010_in_progress.md",
          updatedAt: "2026-02-14T10:00:00Z",
          indicators: { Status: "In progress", Progress: "32%" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 90,
          charCount: 1700,
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    });

    expect(html).toContain("data-timeline-period=\"week\"");
    expect(html).toContain("data-timeline-period=\"day\"");
    expect(html).toContain("WIP");
    expect(html).toContain("Blocked");
    expect(html).toContain("Open request without backlog");
    expect(html).toContain("Stale navigation request");
    expect(html).toContain("No closed items in the last 30 days.");
    expect(html).toContain("Status distribution");
    expect(html).toContain("Theme distribution");
    expect(html).toContain("Understanding distribution");
    expect(html).toContain("Confidence distribution");
    expect(html).toContain("Requests without backlog");
  });

  it("switches the corpus explorer between map and timeline panels without losing the project lens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));

    const html = buildLogicsCorpusInsightsHtml({
      webview: createWebview() as never,
      root: "/workspace/project",
      items: [
        {
          id: "req_001_explore",
          title: "Explorer request",
          stage: "request",
          path: "/workspace/project/logics/request/req_001_explore.md",
          relPath: "logics/request/req_001_explore.md",
          filename: "req_001_explore.md",
          updatedAt: "2026-04-07T10:00:00Z",
          indicators: { Status: "Ready", Theme: "Navigation" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 52,
          charCount: 1200,
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    });

    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window) {
        window.acquireVsCodeApi = () => ({
          postMessage: () => undefined,
          getState: () => null,
          setState: () => undefined
        });
      }
    });

    await Promise.resolve();

    const mapButton = dom.window.document.querySelector('[data-explorer-view="map"]') as HTMLButtonElement | null;
    const timelineButton = dom.window.document.querySelector('[data-explorer-view="timeline"]') as HTMLButtonElement | null;
    const mapPanel = dom.window.document.getElementById("explorer-map");
    const timelinePanel = dom.window.document.getElementById("explorer-timeline");

    expect(dom.window.document.body.textContent).toContain("/workspace/project");
    expect(mapButton?.classList.contains("logics-insights__button--active")).toBe(true);
    expect(timelineButton?.classList.contains("logics-insights__button--active")).toBe(false);
    expect(mapPanel?.hidden).toBe(false);
    expect(timelinePanel?.hidden).toBe(true);

    timelineButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(mapButton?.classList.contains("logics-insights__button--active")).toBe(false);
    expect(timelineButton?.classList.contains("logics-insights__button--active")).toBe(true);
    expect(mapPanel?.hidden).toBe(true);
    expect(timelinePanel?.hidden).toBe(false);
    expect(timelinePanel?.textContent).toContain("Delivery timeline");
  });

  it("renders an empty logics timeline when no closed items exist in the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));
    const html = buildLogicsCorpusInsightsHtml({
      webview: createWebview() as never,
      root: "/workspace/project",
      items: [
        {
          id: "req_001_open",
          title: "Open request",
          stage: "request",
          path: "/workspace/project/logics/request/req_001_open.md",
          relPath: "logics/request/req_001_open.md",
          filename: "req_001_open.md",
          updatedAt: "2026-04-07T10:00:00Z",
          indicators: { Status: "Ready" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 24,
          charCount: 800,
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    });

    expect(html).toContain("Delivery timeline");
    expect(html).toContain("No closed items in the last 6 weeks.");
    expect(html).toContain("No closed items in the last 30 days.");
  });

  it("switches the delivery timeline between week and day panels without rebuilding the controls", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T12:00:00Z"));

    const html = buildLogicsCorpusInsightsHtml({
      webview: createWebview() as never,
      root: "/workspace/project",
      items: [
        {
          id: "task_001_closed",
          title: "Closed task",
          stage: "task",
          path: "/workspace/project/logics/tasks/task_001_closed.md",
          relPath: "logics/tasks/task_001_closed.md",
          filename: "task_001_closed.md",
          updatedAt: "2026-04-07T10:00:00Z",
          indicators: { Status: "Done" },
          summaryPoints: [],
          acceptanceCriteria: [],
          lineCount: 42,
          charCount: 1000,
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    });

    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window) {
        window.acquireVsCodeApi = () => ({
          postMessage: () => undefined,
          getState: () => null,
          setState: () => undefined
        });
      }
    });

    await Promise.resolve();

    const weekButton = dom.window.document.querySelector('[data-timeline-period="week"]') as HTMLButtonElement | null;
    const dayButton = dom.window.document.querySelector('[data-timeline-period="day"]') as HTMLButtonElement | null;
    const weekPanel = dom.window.document.getElementById("timeline-week");
    const dayPanel = dom.window.document.getElementById("timeline-day");

    expect(weekButton?.classList.contains("logics-insights__button--active")).toBe(true);
    expect(dayButton?.classList.contains("logics-insights__button--active")).toBe(false);
    expect(weekButton?.getAttribute("aria-pressed")).toBe("true");
    expect(dayButton?.getAttribute("aria-pressed")).toBe("false");
    expect(weekPanel?.hidden).toBe(false);
    expect(dayPanel?.hidden).toBe(true);

    dayButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(weekButton?.classList.contains("logics-insights__button--active")).toBe(false);
    expect(dayButton?.classList.contains("logics-insights__button--active")).toBe(true);
    expect(weekButton?.getAttribute("aria-pressed")).toBe("false");
    expect(dayButton?.getAttribute("aria-pressed")).toBe("true");
    expect(weekPanel?.hidden).toBe(true);
    expect(dayPanel?.hidden).toBe(false);

    const dayLabels = Array.from(dayPanel?.querySelectorAll(".logics-insights__timeline-label") ?? [])
      .map((node) => node.textContent ?? "");
    expect(dayLabels.length).toBeGreaterThan(0);
    expect(dayLabels.every((label) => /^[A-Z]\d{1,2}$/.test(label))).toBe(true);
  });

  it("renders actionable efficiency recommendation sections from recent hybrid signals", () => {
    const html = buildHybridInsightsHtml({
      webview: createWebview() as never,
      rootLabel: "/workspace/project",
      report: {
        measured: {
          totals: {
            runs: 6,
            local_runs: 1,
            fallback_runs: 1,
            degraded_runs: 1,
            review_recommended_runs: 1
          },
          execution_paths: {
            remote: 3,
            "cache-hit": 1,
            "deterministic-preclassified": 1,
            fallback: 1
          }
        },
        derived: {
          rates: {
            local_offload_rate: 0.16,
            fallback_rate: 0.16,
            degraded_rate: 0.16,
            review_recommended_rate: 0.16
          },
          report_state: {},
          health_summary: [],
          dispatch_split: [],
          execution_path_split: [],
          top_degraded_reasons: [],
          top_fallback_reasons: [],
          flow_breakdown: {}
        },
        recent_runs: [
          {
            flow: "commit-plan",
            result_status: "ok",
            backend_requested: "openai",
            backend_used: "openai",
            execution_path: "remote",
            recorded_at: "2026-04-04T08:00:00Z",
            validated_summary: "Live remote run."
          },
          {
            flow: "commit-plan",
            result_status: "ok",
            backend_requested: "openai",
            backend_used: "openai",
            execution_path: "remote",
            recorded_at: "2026-04-04T08:10:00Z",
            validated_summary: "Repeat live remote run."
          },
          {
            flow: "commit-plan",
            result_status: "ok",
            backend_requested: "openai",
            backend_used: "openai",
            execution_path: "cache-hit",
            recorded_at: "2026-04-04T08:11:00Z",
            validated_summary: "Cache served the repeat."
          },
          {
            flow: "diff-risk",
            result_status: "ok",
            backend_requested: "auto",
            backend_used: "deterministic",
            execution_path: "deterministic-preclassified",
            recorded_at: "2026-04-04T08:20:00Z",
            validated_summary: "Pre-classifier skipped AI."
          },
          {
            flow: "handoff-packet",
            result_status: "degraded",
            backend_requested: "openai",
            backend_used: "openai",
            execution_path: "remote",
            recorded_at: "2026-04-04T08:30:00Z",
            degraded_reasons: ["profile-downgrade"],
            validated_summary: "Remote handoff packet with capped profile."
          }
        ],
        estimated: {
          assumptions: {},
          proxies: {}
        },
        sources: {},
        limits: {
          window_days: 7,
          recent_limit: 10
        }
      }
    });

    expect(html).toContain("Efficiency Recommendations");
    expect(html).toContain("Cache Effectiveness");
    expect(html).toContain("Deterministic Pre-Classification");
    expect(html).toContain("Profile Downgrade Events");
    expect(html).toContain("commit-plan: 1 cache hit(s), 1 recent repeat call(s) still ran live.");
    expect(html).toContain("diff-risk: 1 deterministic pre-classification(s) skipped an AI dispatch.");
    expect(html).toContain("handoff-packet via openai: 1 deep-profile downgrade event(s) were recorded.");
  });

  it("renders the orchestrator webview snapshot", () => {
    const html = buildLogicsWebviewHtml(
      vscode.Uri.file("/extension"),
      createWebview() as never
    );

    expect(html).toMatchSnapshot();
  });

  it("renders the read preview snapshot", () => {
    const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), "logics-html-"));

    const html = buildReadPreviewHtml({
      item: {
        id: "task_110",
        title: "Task 110",
        stage: "task",
        relPath: "logics/tasks/task_110.md",
        indicators: {
          Status: "Ready",
          Progress: "50%",
          Complexity: "Medium"
        },
        references: [{ path: "logics/backlog/item_042_example.md" }],
        usedBy: [{ id: "prod_005_preview", relPath: "logics/product/prod_005_preview.md", title: "Preview brief", stage: "product" }]
      },
      markdown: [
        "## Summary",
        "",
        "- First item",
        "- Second item",
        "",
        "```mermaid",
        "graph TD",
        "  A --> B",
        "```"
      ].join("\n"),
      webview: createWebview() as never,
      extensionPath,
      linkedItems: [
        {
          id: "item_042_example",
          title: "Example backlog item",
          stage: "backlog",
          relPath: "logics/backlog/item_042_example.md"
        },
        {
          id: "prod_005_preview",
          title: "Preview brief",
          stage: "product",
          relPath: "logics/product/prod_005_preview.md"
        }
      ]
    });

    expect(html).toMatchSnapshot();
    expect(html).toContain("File: <code>logics/tasks/task_110.md</code>");
    expect(html).not.toContain("task_110 •");
    fs.rmSync(extensionPath, { recursive: true, force: true });
  });

  it("removes the document heading and indicator block from the read preview body", () => {
    const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), "logics-html-"));

    const html = buildReadPreviewHtml({
      item: {
        id: "task_111",
        title: "Task 111",
        stage: "task",
        relPath: "logics/tasks/task_111.md",
        indicators: {
          Status: "Ready",
          Progress: "25%"
        }
      },
      markdown: [
        "## task_111 - Task 111",
        "> From version: 1.0.0",
        "> Schema version: 1.0.0",
        "> Status: Ready",
        "",
        "- [ ] Open item",
        "- [x] Closed item"
      ].join("\n"),
      webview: createWebview() as never,
      extensionPath
    });

    expect(html).toContain("Task 111");
    expect(html).not.toContain("<h2>task_111 - Task 111</h2>");
    expect(html).not.toContain("From version: 1.0.0");
    expect(html).toContain('class="markdown-preview__task-checkbox"');
    expect(html).toContain('checked');
    fs.rmSync(extensionPath, { recursive: true, force: true });
  });

  it("renders markdown tables inside the read preview surface", () => {
    const extensionPath = fs.mkdtempSync(path.join(os.tmpdir(), "logics-html-"));

    const html = buildReadPreviewHtml({
      item: {
        id: "req_149",
        title: "Improve Markdown preview table rendering in Claude-authored docs",
        stage: "request",
        relPath: "logics/request/req_149_improve_markdown_preview_table_rendering_in_claude_authored_docs.md"
      },
      markdown: [
        "## Context",
        "",
        "| Surface | Pre-V2 role | Post-V2 role |",
        "|---|---|---|",
        "| DeepVault - Navy | Primary local explorer for validation | Internal operator tool for content inspection and ingestion debugging |"
      ].join("\n"),
      webview: createWebview() as never,
      extensionPath
    });

    expect(html).toContain('class="markdown-preview__table-wrap"');
    expect(html).toContain("<table>");
    expect(html).toContain("DeepVault - Navy");
    expect(html).toContain("Internal operator tool for content inspection and ingestion debugging");
    fs.rmSync(extensionPath, { recursive: true, force: true });
  });

  it("sorts recent hybrid runs newest first and formats recent timestamps relatively", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-04T12:00:00Z"));

    const html = buildHybridInsightsHtml({
      webview: createWebview() as never,
      rootLabel: "/workspace/project",
      report: {
        generated_at: "2026-04-04T11:45:00.658694+00:00",
        measured: {
          totals: {
            runs: 2,
            local_runs: 1,
            fallback_runs: 1,
            degraded_runs: 0,
            review_recommended_runs: 0
          },
          execution_paths: {
            local: 1,
            fallback: 1
          }
        },
        derived: {
          rates: {
            local_offload_rate: 0.5,
            fallback_rate: 0.5,
            degraded_rate: 0,
            review_recommended_rate: 0
          },
          report_state: {},
          health_summary: [],
          dispatch_split: [],
          execution_path_split: [],
          top_degraded_reasons: [],
          top_fallback_reasons: []
        },
        recent_runs: [
          {
            flow: "older-flow",
            result_status: "ok",
            backend_requested: "auto",
            backend_used: "ollama",
            execution_path: "local",
            recorded_at: "2026-04-03T08:00:00Z",
            validated_summary: "Older run"
          },
          {
            flow: "recent-flow",
            result_status: "ok",
            backend_requested: "auto",
            backend_used: "codex",
            execution_path: "fallback",
            recorded_at: "2026-04-04T11:30:00Z",
            validated_summary: "Recent run"
          }
        ],
        estimated: {
          assumptions: {},
          proxies: {}
        },
        sources: {},
        limits: {
          window_days: 7,
          recent_limit: 10
        }
      }
    });

    expect(html.indexOf("recent-flow")).toBeGreaterThan(-1);
    expect(html.indexOf("older-flow")).toBeGreaterThan(-1);
    expect(html.indexOf("recent-flow")).toBeLessThan(html.indexOf("older-flow"));
    expect(html).toContain("30 min ago");
    expect(html).toContain("14 min ago");
    expect(html).not.toContain("2026-04-04T11:30:00Z");
    expect(html).not.toContain("2026-04-04T11:45:00.658694+00:00");
  });
});
