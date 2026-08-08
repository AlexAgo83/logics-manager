/**
 * Regression tests for item_630: the state the core shares with its screens, named once.
 *
 * Three lifts each built the same seam by hand — a set of accessor thunks picked per
 * screen — and the wiring failed four different ways while being written. This pins the
 * store that replaces them, and the property those hand-built seams only had by convention.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js module shared with the browser host
import { createViewerState, readerFor } from "../clients/viewer/src/browser-host/state.js";

const hostSource = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");

describe("the shared viewer state", () => {
  it("carries what is shared, not everything the host holds", () => {
    // A store holding all forty-three closure bindings would be a second name for the
    // closure, not a boundary. These four are the ones the screens actually read.
    const state = createViewerState();

    expect(Object.keys(state).sort()).toEqual([
      "latestRepoRoot",
      "latestRepository",
      "viewerFilterState",
      "viewerPreferences"
    ]);
  });

  it("lets the host read and write, and a screen only read", () => {
    const state = createViewerState({ latestRepoRoot: "/one" });
    const reader = readerFor(state);

    expect(reader.latestRepoRoot).toBe("/one");
    state.latestRepoRoot = "/two";
    expect(reader.latestRepoRoot).toBe("/two");

    // Frozen: a screen writing shared state is a mistake the seam should not allow.
    expect(() => {
      (reader as { latestRepoRoot: string }).latestRepoRoot = "/three";
    }).toThrow();
    expect(state.latestRepoRoot).toBe("/two");
  });

  it("is declared before any screen is constructed", () => {
    // The wiring failed on exactly this before: a value read before it existed.
    const declaration = hostSource.indexOf("const viewerState = createViewerState(");
    const firstScreen = hostSource.indexOf("createCdxScreen({");

    expect(declaration).toBeGreaterThan(-1);
    expect(declaration).toBeLessThan(firstScreen);
  });

  it("hands every screen the same reader rather than a hand-picked set of thunks", () => {
    const readers = hostSource.match(/shared: readerFor\(viewerState\)/g) || [];

    expect(readers.length).toBe(3);
    // No screen still receives a binding as its own thunk.
    for (const binding of ["viewerPreferences", "latestRepoRoot", "latestRepository", "viewerFilterState"]) {
      expect(hostSource).not.toContain(`${binding}: () => viewerState.${binding}`);
    }
  });
});
