import { describe, expect, it, vi } from "vitest";
import { bootstrapWebview } from "./webviewHarnessTestUtils";

describe("webview ui status", () => {
  it("shows warning banners, notifies the harness, and hides after the timeout", () => {
    vi.useFakeTimers();
    const { dom } = bootstrapWebview();
    const notify = vi.fn();
    const layout = dom.window.document.getElementById("layout");
    const api = dom.window.createCdxLogicsUiStatusApi({
      documentRef: dom.window.document,
      layout,
      harnessBridge: { notify }
    });

    api.showStatus("Update available", "warn");

    const banner = dom.window.document.querySelector(".status-banner") as HTMLElement | null;
    expect(banner?.hidden).toBe(false);
    expect(banner?.dataset.tone).toBe("warn");
    expect(banner?.textContent).toBe("Update available");
    expect(notify).toHaveBeenCalledWith("Update available", "warn");

    api.showStatus("Still available", "info");
    api.showStatus("", "warn");
    const detachedApi = dom.window.createCdxLogicsUiStatusApi({
      documentRef: { body: null }
    });

    expect(banner?.textContent).toBe("Still available");
    expect(banner?.dataset.tone).toBe("info");
    expect(notify).toHaveBeenCalledTimes(2);
    expect(detachedApi.ensureStatusBanner()).toBeNull();

    vi.advanceTimersByTime(4500);

    expect(banner?.hidden).toBe(true);
    vi.useRealTimers();
  });
});
