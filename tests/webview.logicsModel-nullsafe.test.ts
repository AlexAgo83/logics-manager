import { describe, expect, it } from "vitest";
import { bootstrapWebview } from "./webviewHarnessTestUtils";

describe("CdxLogicsModel null-safety", () => {
  it("returns safe defaults for null/undefined item instead of throwing", () => {
    const { dom } = bootstrapWebview();
    const model = (dom.window as unknown as { CdxLogicsModel: Record<string, unknown> }).CdxLogicsModel;
    expect(model).toBeTruthy();

    for (const arg of [null, undefined]) {
      expect(() => (model.collectCompanionDocs as Function)(arg, [])).not.toThrow();
      expect((model.collectCompanionDocs as Function)(arg, [])).toEqual([]);
      expect((model.collectSpecs as Function)(arg, [])).toEqual([]);
      expect((model.collectPrimaryFlowItems as Function)(arg, [])).toEqual([]);
      expect((model.buildDependencyMap as Function)(arg, [])).toEqual({ groups: [], nodes: [], edges: [] });
      expect(() => (model.getRelationshipInsights as Function)(arg, [])).not.toThrow();
      expect(() => (model.buildContextPack as Function)(arg, [], {})).not.toThrow();
    }
  });
});
