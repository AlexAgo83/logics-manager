import { describe, expect, it } from "vitest";
import { viewerStateSignature } from "../clients/viewer/src/browser-host/render.js";

describe("viewerStateSignature", () => {
  it("changes when bootstrap warnings clear", () => {
    const basePayload = {
      root: "/workspace/logics-manager",
      repository: { root: "/workspace/logics-manager" },
      capabilities: { logics: { state: "ready", available: true } },
      projects: [],
      items: []
    };

    expect(viewerStateSignature({
      ...basePayload,
      bootstrapWarning: { title: "Logics bootstrap refresh recommended", message: "Run bootstrap." }
    })).not.toBe(viewerStateSignature({ ...basePayload, bootstrapWarning: null }));
  });
});
