import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
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
    expect(html).toContain("Done, Archived, Obsolete");
    expect(html).toContain("Distribution snapshots");
    expect(html).toContain("Getting Started");
    expect(html).toContain("data-action=\"open-onboarding\"");
    expect(html).toContain("data-action=\"about\"");
    expect(html).toContain("<svg viewBox=\"0 0 120 120\"");
    expect(html).toContain("<strong>1</strong>");
    expect(html).toContain("<strong>3</strong>");
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
