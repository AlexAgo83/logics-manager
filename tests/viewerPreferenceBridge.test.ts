/**
 * Regression tests for item_641: the extension's copy is a cache, not the record.
 *
 * It used to carry two of twelve preference fields across the iframe boundary by hand and
 * keep them in global state, while ten never left the browser. Once the server holds the
 * record, that path is a first-paint cache — and the webview state entry it also wrote was
 * read by nothing.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const webviewHtml = readFileSync("clients/vscode/src/logicsWebviewHtml.ts", "utf8");
const hostSource = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");

describe("the viewer preference bridge", () => {
  it("no longer writes a webview state entry nothing reads", () => {
    expect(webviewHtml).not.toContain("vscode.setState");
  });

  it("still seeds the frame so the first paint is immediate", () => {
    expect(webviewHtml).toContain("viewer-favorite-projects");
    expect(webviewHtml).toContain("viewer-project-last-used");
  });

  it("asks the server for the record as soon as the frame is ready", () => {
    expect(hostSource).toContain("hydrateViewerPreferencesFromServer");
    expect(hostSource).toMatch(/fetch\("\/api\/preferences"\)/);
  });

  it("lets the record win where it disagrees with the cache", () => {
    // The hydrate spreads the server payload over the cached values, not the reverse.
    const hydrate = /async function hydrateViewerPreferencesFromServer\(\)[\s\S]*?\n  }/.exec(hostSource)![0];
    // req_313 moved the binding into the shared store; the precedence is unchanged.
    const spread = /viewerState\.viewerPreferences = \{ \.\.\.viewerState\.viewerPreferences, \.\.\.data\.payload/.exec(hydrate);

    expect(spread, hydrate).not.toBeNull();
  });

  it("writes every preference change through to the record", () => {
    const update = /function updateViewerPreferences\(patch[\s\S]*?\n  }/.exec(hostSource)![0];

    expect(update).toContain("persistViewerPreferencesToServer");
  });
});
