import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: {
    file: (value: string) => ({ fsPath: value, path: value, toString: () => value }),
    joinPath: (base: { fsPath?: string; path?: string }, ...segments: string[]) => {
      const basePath = base.fsPath ?? base.path ?? "";
      const joined = path.join(basePath, ...segments);
      return {
        fsPath: joined,
        path: joined,
        toString: () => joined
      };
    }
  }
}));

import * as vscode from "vscode";
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
      toString: () => `webview:${uri.fsPath ?? uri.path ?? uri.toString?.() ?? ""}`
    })
  };
}

describe("logics HTML builders", () => {
  const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);

  afterEach(() => {
    randomSpy.mockClear();
  });

  it("renders the hybrid insights report snapshot", () => {
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
          ]
        },
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
      title: "Task 110",
      itemId: "task_110",
      relPath: "logics/tasks/task_110.md",
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
      extensionPath
    });

    expect(html).toMatchSnapshot();
    fs.rmSync(extensionPath, { recursive: true, force: true });
  });
});
