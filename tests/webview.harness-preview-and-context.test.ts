import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, productItem, pushData, specItem } from "./webviewHarnessTestUtils";

describe("webview harness preview, context, and handoff behaviors", () => {
  it("renders markdown preview with Mermaid bootstrap in harness read mode", async () => {
    const mermaidItem = {
      ...baseItem,
      path: "/workspace/mock/logics/request/req_000_kickoff.md",
      relPath: "logics/request/req_000_kickoff.md"
    };
    const { dom, openedDocuments } = bootstrapWebview({
      harness: true,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () =>
          [
            "# Kickoff",
            "",
            "```mermaid",
            "flowchart TD",
            "A[Need] --> B[Result]",
            "```"
          ].join("\n")
      })
    });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [mermaidItem]
    });

    const readButton = dom.window.document.querySelector('[data-action="read"]');
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const html = openedDocuments[0] || "";
    expect(html.includes('class="mermaid"')).toBe(true);
    expect(html.includes("/node_modules/mermaid/dist/mermaid.min.js")).toBe(true);
    expect(html.includes("Mermaid preview unavailable")).toBe(true);
    expect(html.includes("File: <code>logics/request/req_000_kickoff.md</code>")).toBe(true);
  });

  it("renders attention explain, context pack preview, and dependency-map selection for a selected item", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const request = {
      ...baseItem,
      id: "req_010_context_request",
      title: "Context request",
      relPath: "logics/request/req_010_context_request.md",
      path: "/workspace/mock/logics/request/req_010_context_request.md",
      indicators: { Status: "Draft" },
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_010_context_backlog.md" }]
    };
    const backlog = {
      ...baseItem,
      id: "item_010_context_backlog",
      title: "Context backlog",
      stage: "backlog",
      relPath: "logics/backlog/item_010_context_backlog.md",
      path: "/workspace/mock/logics/backlog/item_010_context_backlog.md",
      indicators: { Status: "Blocked", Progress: "45%" },
      references: [
        { kind: "request", label: "Request", path: "logics/request/req_010_context_request.md" },
        { kind: "task", label: "Task", path: "logics/tasks/task_010_context_task.md" },
        { kind: "manual", label: "Reference", path: "logics/product/prod_010_context_product.md" },
        { kind: "manual", label: "Reference", path: "logics/specs/spec_010_context_spec.md" }
      ]
    };
    const task = {
      ...baseItem,
      id: "task_010_context_task",
      title: "Context task",
      stage: "task",
      relPath: "logics/tasks/task_010_context_task.md",
      path: "/workspace/mock/logics/tasks/task_010_context_task.md",
      indicators: { Status: "Ready", Progress: "10%" },
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_010_context_backlog.md" }]
    };
    const product = {
      ...productItem,
      id: "prod_010_context_product",
      title: "Context product",
      relPath: "logics/product/prod_010_context_product.md",
      path: "/workspace/mock/logics/product/prod_010_context_product.md",
      usedBy: [{ id: "item_010_context_backlog", stage: "backlog", title: "Context backlog", relPath: "logics/backlog/item_010_context_backlog.md" }]
    };
    const spec = {
      ...specItem,
      id: "spec_010_context_spec",
      title: "Context spec",
      relPath: "logics/specs/spec_010_context_spec.md",
      path: "/workspace/mock/logics/specs/spec_010_context_spec.md",
      usedBy: [{ id: "item_010_context_backlog", stage: "backlog", title: "Context backlog", relPath: "logics/backlog/item_010_context_backlog.md" }]
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "item_010_context_backlog",
      items: [request, backlog, task, product, spec]
    });

    const document = dom.window.document;
    const detailsBody = document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Attention explain");
    expect(detailsBody?.textContent).toContain("Blocked");
    expect(detailsBody?.textContent).toContain("Context pack for AI assistants");
    expect(detailsBody?.textContent).toContain("Dependency map");
    expect(detailsBody?.textContent).toContain("Mode standard");
    expect(detailsBody?.textContent).toContain("Characters");

    const previewButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Preview standard")
    );
    previewButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(detailsBody?.textContent).toContain("# Assistant Context Pack");

    const injectButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Copy for assistant")
    );
    injectButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) => message.type === "inject-prompt" && String(message.prompt || "").includes("# Assistant Context Pack")
      )
    ).toBe(true);

    const taskNode = Array.from(detailsBody?.querySelectorAll(".details__map-node") || []).find((button) =>
      button.textContent?.includes("task_010_context_task")
    );
    taskNode?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(document.getElementById("details-title")?.textContent).toContain("Context task");
  });

  it("supports summary-only and fresh-thread clipboard handoffs", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const item = {
      ...baseItem,
      id: "task_011_summary_only",
      title: "Summary only task",
      stage: "task",
      relPath: "logics/tasks/task_011_summary_only.md",
      path: "/workspace/mock/logics/tasks/task_011_summary_only.md",
      indicators: { Status: "Ready" },
      summaryPoints: ["Keep the first handoff compact.", "Escalate only when extra context is needed."],
      acceptanceCriteria: ["A summary-only mode exists.", "A fresh-thread launch remains available."]
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: item.id,
      changedPaths: ["src/logicsViewProvider.ts", "media/renderDetails.js"],
      items: [item]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const previewButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Preview summary-only")
    );
    previewButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(detailsBody?.textContent).toContain("Mode summary-only");
    expect(detailsBody?.textContent).toContain("Summary");

    const freshThreadButton = Array.from(detailsBody?.querySelectorAll("button") || []).find((button) =>
      button.textContent?.includes("Copy for new assistant session")
    );
    freshThreadButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) =>
          message.type === "inject-prompt" &&
          message.options &&
          message.options.preferNewThread === true &&
          String(message.prompt || "").includes("# Assistant Context Pack")
      )
    ).toBe(true);
  });

  it("shows a primary attention reason first and wires remediation actions when available", () => {
    const { dom, postedMessages } = bootstrapWebview({
      harness: false,
      initialState: { collapsedDetailSections: [] }
    });

    const request = {
      ...baseItem,
      id: "req_011_attention_reason",
      title: "Attention request",
      relPath: "logics/request/req_011_attention_reason.md",
      path: "/workspace/mock/logics/request/req_011_attention_reason.md",
      indicators: { Status: "Draft" }
    };

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_011_attention_reason",
      items: [request]
    });

    const document = dom.window.document;
    const primaryReason = document.querySelector(".details__reason-card--primary");
    expect(primaryReason?.textContent).toContain("Workflow inconsistent");

    const promoteButton = Array.from(document.querySelectorAll(".details__inline-cta")).find((button) =>
      button.textContent?.includes("Promote request")
    );
    promoteButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "promote" && message.id === "req_011_attention_reason")).toBe(
      true
    );
  });
});
