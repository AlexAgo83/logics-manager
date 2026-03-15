import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  canPromote,
  compareStages,
  getManagedDocDirectories,
  indexLogics,
  inferStage,
  isRequestProcessed,
  isRequestUsed,
  promotionCommand,
  STAGE_ORDER
} from "../src/logicsIndexer";

const tempRoots: string[] = [];

function mkRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-indexer-"));
  tempRoots.push(root);
  for (const dir of [
    "logics/request",
    "logics/backlog",
    "logics/tasks",
    "logics/product",
    "logics/architecture",
    "logics/specs"
  ]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  return root;
}

function write(root: string, relPath: string, content: string): void {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("logicsIndexer", () => {
  it("indexes stages and links references across request/backlog/task", () => {
    const root = mkRepo();
    write(
      root,
      "logics/request/req_000_feature.md",
      [
        "## req_000_feature - Feature Request",
        "> Understanding: 90%",
        "# Backlog",
        "- `logics/backlog/item_000_feature.md`",
        "# References",
        "- `logics/specs/spec_000_feature.md`"
      ].join("\n")
    );
    write(
      root,
      "logics/backlog/item_000_feature.md",
      [
        "## item_000_feature - Feature Backlog",
        "> Progress: 10%",
        "# Notes",
        "- Derived from `logics/request/req_000_feature.md`."
      ].join("\n")
    );
    write(
      root,
      "logics/tasks/task_000_feature.md",
      [
        "## task_000_feature - Feature Task",
        "> Progress: 0%",
        "# Context",
        "Derived from `logics/backlog/item_000_feature.md`",
        "# References",
        "- `src/extension.ts`"
      ].join("\n")
    );
    write(
      root,
      "logics/specs/spec_000_feature.md",
      ["## spec_000_feature - Feature Spec", "# Traceability", "- AC1"].join("\n")
    );

    const items = indexLogics(root);
    expect(items).toHaveLength(4);

    const request = items.find((item) => item.id === "req_000_feature");
    const backlog = items.find((item) => item.id === "item_000_feature");
    const task = items.find((item) => item.id === "task_000_feature");
    expect(request).toBeDefined();
    expect(backlog).toBeDefined();
    expect(task).toBeDefined();

    expect(request?.references.some((ref) => ref.kind === "backlog")).toBe(true);
    expect(request?.references.some((ref) => ref.kind === "manual")).toBe(true);
    expect(request?.usedBy.some((usage) => usage.id === "item_000_feature")).toBe(true);
    expect(request?.isPromoted).toBe(true);

    expect(backlog?.references.some((ref) => ref.kind === "from")).toBe(true);
    expect(backlog?.usedBy.some((usage) => usage.id === "task_000_feature")).toBe(true);
    expect(backlog?.isPromoted).toBe(true);
  });

  it("collects manual used-by links and infers usage stage from path", () => {
    const root = mkRepo();
    write(
      root,
      "logics/request/req_001_docs.md",
      [
        "## req_001_docs - Docs Request",
        "# Used by",
        "- `logics/tasks/task_010_docs.md`",
        "- `logics/backlog/item_009_docs.md`"
      ].join("\n")
    );

    const items = indexLogics(root);
    const request = items.find((item) => item.id === "req_001_docs");
    expect(request).toBeDefined();
    expect(request?.usedBy).toHaveLength(2);
    expect(request?.usedBy.find((usage) => usage.id === "task_010_docs")?.stage).toBe("task");
    expect(request?.usedBy.find((usage) => usage.id === "item_009_docs")?.stage).toBe("backlog");
  });

  it("parses legacy list-style references and used-by links", () => {
    const root = mkRepo();
    write(
      root,
      "logics/backlog/item_002_legacy_links.md",
      [
        "## item_002_legacy_links - Legacy Links",
        "# Notes",
        "- References:",
        "  - `src/extension.ts`",
        "  - `logics/request/req_002_docs.md`",
        "- Used by:",
        "  - `logics/tasks/task_020_followup.md`"
      ].join("\n")
    );

    const items = indexLogics(root);
    const backlog = items.find((item) => item.id === "item_002_legacy_links");
    expect(backlog).toBeDefined();
    expect(backlog?.references.some((ref) => ref.kind === "manual" && ref.path === "src/extension.ts")).toBe(true);
    expect(backlog?.references.some((ref) => ref.kind === "manual" && ref.path.includes("req_002_docs"))).toBe(true);
    expect(backlog?.usedBy.some((usage) => usage.id === "task_020_followup")).toBe(true);
  });

  it("indexes spec files with req_ prefix inside logics/specs", () => {
    const root = mkRepo();
    write(root, "logics/specs/req_002_acceptance_traceability.md", "## req_002_acceptance_traceability - Traceability");

    const items = indexLogics(root);
    expect(items).toHaveLength(1);
    expect(items[0].stage).toBe("spec");
    expect(items[0].id).toBe("req_002_acceptance_traceability");
  });

  it("indexes product and architecture companion docs and preserves stage order", () => {
    const root = mkRepo();
    write(root, "logics/product/prod_000_plugin_ux.md", "## prod_000_plugin_ux - Plugin UX");
    write(root, "logics/architecture/adr_000_plugin_model.md", "## adr_000_plugin_model - Plugin Model");
    write(root, "logics/request/req_003_plugin.md", "## req_003_plugin - Plugin Request");
    write(root, "logics/specs/spec_003_plugin.md", "## spec_003_plugin - Plugin Spec");

    const items = indexLogics(root);
    expect(items.map((item) => item.stage)).toEqual(["request", "product", "architecture", "spec"]);
    expect(items.find((item) => item.id === "prod_000_plugin_ux")?.stage).toBe("product");
    expect(items.find((item) => item.id === "adr_000_plugin_model")?.stage).toBe("architecture");
  });

  it("treats related indicators on companion docs as managed references", () => {
    const root = mkRepo();
    write(root, "logics/request/req_010_layout.md", "## req_010_layout - Layout Request");
    write(
      root,
      "logics/architecture/adr_010_layout_rules.md",
      [
        "## adr_010_layout_rules - Layout Rules",
        "> Date: 2026-03-15",
        "> Status: Accepted",
        "> Drivers: Keep layout stable.",
        "> Related request: `req_010_layout`",
        "> Related backlog: `(none yet)`",
        "> Related task: `(none yet)`",
        "> Reminder: Keep refs current."
      ].join("\n")
    );

    const items = indexLogics(root);
    const request = items.find((item) => item.id === "req_010_layout");
    const adr = items.find((item) => item.id === "adr_010_layout_rules");
    expect(adr?.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "manual", path: "logics/request/req_010_layout.md" })
      ])
    );
    expect(request?.usedBy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "adr_010_layout_rules", stage: "architecture" })
      ])
    );
  });

  it("normalizes bare managed doc ids inside references and used-by sections", () => {
    const root = mkRepo();
    write(root, "logics/request/req_011_traceability.md", "## req_011_traceability - Traceability");
    write(
      root,
      "logics/product/prod_011_traceability.md",
      [
        "## prod_011_traceability - Traceability Brief",
        "# References",
        "- `req_011_traceability`",
        "# Used by",
        "- `task_011_traceability`"
      ].join("\n")
    );

    const items = indexLogics(root);
    const product = items.find((item) => item.id === "prod_011_traceability");
    expect(product?.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "logics/request/req_011_traceability.md" })
      ])
    );
    expect(product?.usedBy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relPath: "logics/tasks/task_011_traceability.md", stage: "task" })
      ])
    );
  });

  it("infers companion doc stages from managed directories and prefixes", () => {
    expect(inferStage("logics/product/prod_002_flow.md", "prod_002_flow")).toBe("product");
    expect(inferStage("logics/architecture/adr_002_flow.md", "adr_002_flow")).toBe("architecture");
    expect(inferStage("logics/specs/req_004_traceability.md", "req_004_traceability")).toBe("spec");
  });

  it("exposes managed directories and ordering helpers for all logics doc families", () => {
    const root = mkRepo();
    expect(STAGE_ORDER).toEqual(["request", "backlog", "task", "product", "architecture", "spec"]);
    expect(compareStages("task", "product")).toBeLessThan(0);
    expect(compareStages("architecture", "spec")).toBeLessThan(0);
    expect(getManagedDocDirectories(root).map((dir) => path.relative(root, dir).replace(/\\/g, "/"))).toEqual([
      "logics/request",
      "logics/backlog",
      "logics/tasks",
      "logics/product",
      "logics/architecture",
      "logics/specs"
    ]);
  });

  it("exposes promotion guard helpers", () => {
    expect(canPromote("request")).toBe(true);
    expect(canPromote("backlog")).toBe(true);
    expect(canPromote("task")).toBe(false);
    expect(canPromote("spec")).toBe(false);
    expect(promotionCommand("request")).toBe("request-to-backlog");
    expect(promotionCommand("backlog")).toBe("backlog-to-task");
    expect(promotionCommand("task")).toBeNull();

    const requestLike = {
      stage: "request",
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_001.md" }],
      usedBy: []
    } as any;
    const untouchedRequest = {
      stage: "request",
      references: [],
      usedBy: []
    } as any;
    const draftBacklog = {
      stage: "backlog",
      relPath: "logics/backlog/item_001.md",
      indicators: { Status: "Draft" }
    } as any;
    const readyBacklog = {
      stage: "backlog",
      relPath: "logics/backlog/item_001.md",
      indicators: { Status: "Ready" }
    } as any;
    expect(isRequestProcessed(requestLike, [draftBacklog])).toBe(false);
    expect(isRequestProcessed(requestLike, [readyBacklog])).toBe(true);
    expect(isRequestUsed(requestLike, [readyBacklog])).toBe(true);
    expect(isRequestUsed(untouchedRequest, [readyBacklog])).toBe(false);

    const requestLikeById = {
      stage: "request",
      references: [{ kind: "backlog", label: "Backlog", path: "item_001" }],
      usedBy: []
    } as any;
    const readyBacklogWithId = {
      id: "item_001",
      stage: "backlog",
      relPath: "logics/backlog/item_001.md",
      indicators: { Status: "Done" }
    } as any;
    expect(isRequestProcessed(requestLikeById, [readyBacklogWithId])).toBe(true);
  });

  it("treats backlog and task items with Progress 100 as processed even when Status is absent", () => {
    const requestLike = {
      stage: "request",
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_001_done_without_status.md" }],
      usedBy: []
    } as any;
    const doneByProgress = {
      stage: "backlog",
      relPath: "logics/backlog/item_001_done_without_status.md",
      indicators: { Progress: "100%" }
    } as any;

    expect(isRequestProcessed(requestLike, [doneByProgress])).toBe(true);
  });

  it("treats archived linked workflow items as processed", () => {
    const requestLike = {
      stage: "request",
      references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_001_archived.md" }],
      usedBy: []
    } as any;
    const archivedBacklog = {
      stage: "backlog",
      relPath: "logics/backlog/item_001_archived.md",
      indicators: { Status: "Archived" }
    } as any;

    expect(isRequestProcessed(requestLike, [archivedBacklog])).toBe(true);
  });

  it("normalizes bare .md backlog references and derived from request backlinks", () => {
    const root = mkRepo();
    write(
      root,
      "logics/request/req_107_feature.md",
      [
        "## req_107_feature - Feature Request",
        "> Status: Done",
        "# Backlog",
        "- `item_525_feature.md`"
      ].join("\n")
    );
    write(
      root,
      "logics/backlog/item_525_feature.md",
      [
        "## item_525_feature - Feature Backlog",
        "> Progress: 100%",
        "# Notes",
        "- Derived from request `req_107_feature`."
      ].join("\n")
    );

    const items = indexLogics(root);
    const request = items.find((item) => item.id === "req_107_feature");
    const backlog = items.find((item) => item.id === "item_525_feature");

    expect(request).toBeDefined();
    expect(backlog).toBeDefined();
    expect(request?.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "backlog", path: "logics/backlog/item_525_feature.md" })
      ])
    );
    expect(request?.usedBy).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "item_525_feature", stage: "backlog" })
      ])
    );
    expect(isRequestProcessed(request as any, items)).toBe(true);
  });
});
