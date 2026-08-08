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
const renderSource = readFileSync("clients/viewer/src/browser-host/render.js", "utf8");
const utilSource = readFileSync("clients/viewer/src/browser-host/util.js", "utf8");
const filtersSource = readFileSync("clients/viewer/src/browser-host/filters.js", "utf8");
const workshopSource = readFileSync("clients/viewer/src/browser-host/workshop.js", "utf8");
const gitSource = readFileSync("clients/viewer/src/browser-host/git.js", "utf8");

function withoutImports(source: string): string {
  return source.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]+";/gs, "");
}

function returnedNames(): string[] {
  const block = /\n  return \{\n([\s\S]*?)\n  \};\n\}/.exec(cdxSource)![1];
  return block.split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
}

function destructuredNames(factory: string): string[] {
  // Anchored so a second screen's destructuring block cannot be swallowed: `[^}]*?`
  // stops at the first closing brace, which is this block's own.
  const block = new RegExp(`  const \\{\\n([^}]*?)\\n  \\} = ${factory}\\(\\{`).exec(hostSource)![1];
  return block.split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
}

describe("the lifted cdx screen", () => {
  it("returns every name the host destructures back into scope", () => {
    const missing = destructuredNames("createCdxScreen")
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

  it("leaves the shared render module carrying nothing only this screen consumes", () => {
    // req_312: 26 exports sat in the module every surface imports while serving one
    // caller. The list is derived, so a rendering function added later is covered.
    const exported = [...renderSource.matchAll(/^export function ([A-Za-z0-9_]+)/gm)].map((match) => match[1]);
    const others = [hostSource, utilSource, filtersSource, workshopSource, gitSource].map(withoutImports).join("\n");
    const cdxBody = withoutImports(cdxSource);

    const cdxOnly = exported.filter((name) => {
      const bare = new RegExp(`(?<![A-Za-z0-9_.])${name}(?![A-Za-z0-9_])`);
      const renderRest = withoutImports(renderSource).replace(new RegExp(`^export function ${name}\\b.*$`, "m"), "");
      return bare.test(cdxBody) && !bare.test(others) && !bare.test(renderRest);
    });

    expect(cdxOnly).toEqual([]);
  });
});

describe("the lifted workshop screen", () => {
  it("returns every name the host destructures back into scope", () => {
    const returned = /\n  return \{\n([^}]*?)\n  \};\n\}/.exec(workshopSource)![1]
      .split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
    const missing = destructuredNames("createWorkshopScreen")
      .map((entry) => entry.replace(/^state: workshopState$/, "state"))
      .filter((name) => !returned.includes(name));

    expect(missing).toEqual([]);
  });

  it("keeps its own state private, reachable only through the named seam", () => {
    const owned = [...workshopSource.matchAll(/^  (?:let|const) ([A-Za-z0-9_]+)/gm)]
      .map((match) => match[1])
      .filter((name) => name !== "state");
    const leaked = owned.filter((name) => {
      const bare = new RegExp(`(?<![A-Za-z0-9_.])${name}(?![A-Za-z0-9_])`);
      return bare.test(hostSource) && !hostSource.includes(`workshopState.${name}`);
    });

    expect(leaked).toEqual([]);
  });

  it("reads the three host bindings it does not own, and writes none of them", () => {
    for (const binding of ["latestRepoRoot", "latestRepository", "viewerPreferences"]) {
      expect(workshopSource).toContain(`host.${binding}()`);
      expect(workshopSource).not.toMatch(new RegExp(`host\\.${binding}\\(\\)\\s*=[^=]`));
    }
  });

  it("does not import the host back", () => {
    expect(workshopSource).not.toContain('from "./index.js"');
  });
});

describe("the lifted git and CI screen", () => {
  it("returns every name the host destructures back into scope", () => {
    const returned = /\n  return \{\n([^}]*?)\n  \};\n\}/.exec(gitSource)![1]
      .split("\n").map((line) => line.trim().replace(/,$/, "")).filter(Boolean);
    const missing = destructuredNames("createGitScreen")
      .map((entry) => entry.replace(/^state: gitState$/, "state"))
      .filter((name) => !returned.includes(name));

    expect(missing).toEqual([]);
  });

  it("keeps its own state private, reachable only through the named seam", () => {
    const owned = [...gitSource.matchAll(/^  (?:let|const) ([A-Za-z0-9_]+)/gm)]
      .map((match) => match[1])
      .filter((name) => name !== "state");
    const leaked = owned.filter((name) => {
      const bare = new RegExp(`(?<![A-Za-z0-9_.])${name}(?![A-Za-z0-9_])`);
      return bare.test(hostSource) && !hostSource.includes(`gitState.${name}`);
    });

    expect(leaked).toEqual([]);
  });

  it("reads the two host bindings it does not own, and writes neither", () => {
    // Twelve before the cdx screen moved; two after it, and both read-only.
    for (const binding of ["latestRepoRoot", "viewerFilterState"]) {
      expect(gitSource).toContain(`host.${binding}()`);
      expect(gitSource).not.toMatch(new RegExp(`host\\.${binding}\\(\\)\\s*=[^=]`));
    }
  });

  it("does not import the host back", () => {
    expect(gitSource).not.toContain('from "./index.js"');
  });
});
