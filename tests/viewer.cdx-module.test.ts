/**
 * Regression tests for item_624: the cdx screen lifted out of the browser host.
 *
 * What would break silently is the seam: the host destructures the screen's functions back
 * into scope, and reaches its state through one named accessor. A binding that stopped
 * being shared, or a function that stopped being returned, would only fail wherever it
 * happens to be used.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cdxSource = readFileSync("clients/viewer/src/browser-host/cdx.js", "utf8");
const hostSource = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");

function returnedNames(): string[] {
  const block = /\n  return \{\n([\s\S]*?)\n  \};\n\}/.exec(cdxSource)![1];
  return block.split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
}

function destructuredNames(): string[] {
  const block = /  const \{\n([\s\S]*?)\n  \} = createCdxScreen\(\{/.exec(hostSource)![1];
  return block.split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
}

describe("the lifted cdx screen", () => {
  it("returns every name the host destructures back into scope", () => {
    const missing = destructuredNames()
      .map((entry) => entry.replace(/^state: cdxState$/, "state"))
      .filter((name) => !returnedNames().includes(name));

    expect(missing).toEqual([]);
  });

  it("keeps its own state private, reachable only through the named seam", () => {
    // The list is read from the module's own declarations rather than written here, so a
    // binding added to the screen later is covered without editing this test.
    // `state` is the seam itself, not a binding hidden behind it.
    const owned = [...cdxSource.matchAll(/^  (?:let|const) ([A-Za-z0-9_]+)/gm)]
      .map((match) => match[1])
      .filter((name) => name !== "state");
    const leaked = owned.filter((name) => {
      const bare = new RegExp(`(?<![A-Za-z0-9_.])${name}(?![A-Za-z0-9_])`);
      return bare.test(hostSource) && !hostSource.includes(`cdxState.${name}`);
    });

    expect(leaked).toEqual([]);
  });

  it("reads the one host binding it does not own, and never writes it", () => {
    expect(cdxSource).toContain("host.viewerPreferences()");
    expect(cdxSource).not.toMatch(/host\.viewerPreferences\(\)\s*=[^=]/);
  });

  it("does not import the host back", () => {
    expect(cdxSource).not.toContain('from "./index.js"');
  });
});
