import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createViewerDiagnostics } from "../clients/viewer/src/browser-host/diagnostics.js";

describe("viewer diagnostics breadcrumb sweep", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("posts a dead sibling's breadcrumb trail from the heartbeat, not just at boot", async () => {
    vi.useFakeTimers();
    const dom = new JSDOM("<main id='layout-main'>alive</main>", { url: "http://127.0.0.1:8765/" });
    vi.stubGlobal("window", dom.window);
    vi.stubGlobal("document", dom.window.document);
    vi.stubGlobal("navigator", dom.window.navigator);
    vi.stubGlobal("HTMLElement", dom.window.HTMLElement);

    // A crashed tab's blob, still fresh at boot: the boot sweep must skip it.
    dom.window.localStorage.setItem(
      "logics.localViewer.breadcrumbs.dead-session",
      JSON.stringify({
        sessionId: "dead-session",
        clean: false,
        touchedAt: Date.now(),
        entries: [{ t: Date.now(), label: "render:start" }]
      })
    );

    const posts: Array<{ route: string; body: any }> = [];
    createViewerDiagnostics({
      getPanel: () => null,
      getTitle: () => null,
      getContent: () => null,
      getBoard: () => null,
      setMeta: () => {},
      postDiagnostic: (route: string, body: any) => {
        posts.push({ route, body });
        return Promise.resolve();
      },
      updateDocumentHeaderNav: () => {},
      renderMermaidDiagrams: () => {}
    });

    const trails = () => posts.filter((p) => p.body?.entry?.kind === "prior-session-breadcrumbs");
    expect(trails()).toHaveLength(0);

    // 30s later the blob is stale; the heartbeat tick sweeps it.
    await vi.advanceTimersByTimeAsync(31_000);
    expect(trails()).toHaveLength(1);
    expect(trails()[0].body.entry.stack).toContain("render:start");
    expect(dom.window.localStorage.getItem("logics.localViewer.breadcrumbs.dead-session")).toBeNull();
  });
});
