import { describe, expect, it } from "vitest";
import { parseHybridInsightsPanelMessage, parseLogicsWebviewMessage } from "../src/logicsViewMessages";

describe("logicsViewMessages", () => {
  it("parses command and prompt messages with their payloads", () => {
    expect(parseLogicsWebviewMessage({ type: "change-project-root" })).toEqual({ type: "change-project-root" });
    expect(parseLogicsWebviewMessage({ type: "reset-project-root" })).toEqual({ type: "reset-project-root" });
    expect(parseLogicsWebviewMessage({ type: "tool-action", action: "change-project-root" })).toEqual({
      type: "tool-action",
      action: "change-project-root"
    });
    expect(
      parseLogicsWebviewMessage({
        type: "inject-prompt",
        prompt: "Use the Logics kit.",
        options: {
          codexCopiedMessage: "Copied",
          fallbackCopiedMessage: "Fallback copied"
        }
      })
    ).toEqual({
      type: "inject-prompt",
      prompt: "Use the Logics kit.",
      options: {
        codexCopiedMessage: "Copied",
        fallbackCopiedMessage: "Fallback copied"
      }
    });
  });

  it("rejects incomplete or invalid webview messages", () => {
    expect(parseLogicsWebviewMessage(null)).toBeNull();
    expect(parseLogicsWebviewMessage({})).toBeNull();
    expect(parseLogicsWebviewMessage({ type: "open" })).toBeNull();
    expect(parseLogicsWebviewMessage({ type: "create-item", kind: "skill" })).toBeNull();
    expect(parseLogicsWebviewMessage({ type: "tool-action", action: "   " })).toBeNull();
    expect(parseLogicsWebviewMessage({ type: "inject-prompt" })).toBeNull();
    expect(parseLogicsWebviewMessage({ type: "create-companion-doc", preferredKind: "guide" })).toEqual({
      type: "create-companion-doc",
      id: undefined,
      preferredKind: undefined
    });
  });

  it("parses hybrid insights panel messages and ignores unrelated payloads", () => {
    expect(parseHybridInsightsPanelMessage({ type: "refresh-report" })).toEqual({ type: "refresh-report" });
    expect(parseHybridInsightsPanelMessage({ type: "open-source-log", source: "audit" })).toEqual({
      type: "open-source-log",
      source: "audit"
    });
    expect(parseHybridInsightsPanelMessage({ type: "open-source-log", source: "measurement" })).toEqual({
      type: "open-source-log",
      source: "measurement"
    });
    expect(parseHybridInsightsPanelMessage({ type: "open-source-log", source: "unknown" })).toBeNull();
    expect(parseHybridInsightsPanelMessage({ type: "refresh-report", source: "audit" })).toEqual({
      type: "refresh-report"
    });
  });
});
