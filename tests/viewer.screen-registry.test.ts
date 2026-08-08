/**
 * Regression tests for item_632: a screen is declared once.
 *
 * A screen used to be recognised by comparing its title against a chain of literals, so
 * adding one meant editing a router, a wiring block and that chain — with nothing failing
 * if one of the three was forgotten.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hostSource = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");
const cdxSource = readFileSync("clients/viewer/src/browser-host/cdx.js", "utf8");
const workshopSource = readFileSync("clients/viewer/src/browser-host/workshop.js", "utf8");
const gitSource = readFileSync("clients/viewer/src/browser-host/git.js", "utf8");

function declaredTitles(): string[] {
  const block = /const screenRegistry = \[([\s\S]*?)\n  \];/.exec(hostSource)![1];
  return [...block.matchAll(/title: "([^"]+)"/g)].map((match) => match[1]);
}

describe("the screen registry", () => {
  it("declares every screen the refresh path used to recognise by title", () => {
    expect(declaredTitles().sort()).toEqual([
      "CDX disk",
      "CDX history",
      "CDX memory",
      "CDX missions",
      "CDX reports",
      "CDX status",
      "Corpus insights",
      "Getting Started",
      "Remote",
      "Validation health",
      "Workshop"
    ]);
  });

  it("routes on the declaration rather than on a chain of title comparisons", () => {
    const refresh = /async function refreshCurrentScreen\(\)[\s\S]*?\n  }/.exec(hostSource)![0];

    expect(refresh).toContain("screenFor(screen)");
    expect(refresh).not.toMatch(/screen === "/);
  });

  it("still falls back to a workflow document for anything not declared", () => {
    const refresh = /async function refreshCurrentScreen\(\)[\s\S]*?\n  }/.exec(hostSource)![0];

    expect(refresh).toContain("showDocumentByPath(screen)");
  });

  it("declares no screen that nothing opens", () => {
    // Every declared title must be a title some code actually sets, or the registry would
    // accumulate entries for screens that no longer exist.
    const opened = new Set(
      [...hostSource.matchAll(/setDocument\("([^"]+)"/g), ...cdxSource.matchAll(/setDocument\("([^"]+)"/g),
       ...workshopSource.matchAll(/setDocument\("([^"]+)"/g), ...gitSource.matchAll(/setDocument\("([^"]+)"/g)]
        .map((match) => match[1])
    );

    for (const title of declaredTitles()) {
      expect(opened, `nothing opens the declared screen "${title}"`).toContain(title);
    }
  });
});
