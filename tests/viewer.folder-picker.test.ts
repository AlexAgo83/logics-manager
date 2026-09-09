/**
 * Regression tests for item_883: the two folder pickers say what the folder is for.
 *
 * The screenshots showed one list of dot-folder clutter under "Select this folder", with
 * a Close, a Cancel and a select that read alike, and nothing distinguishing the folder
 * whose *subfolders* become projects from the folder that *is* one project. The body now
 * names the current folder and its purpose, hides dot-folders behind a toggle that says
 * how many it hid, and leaves the single confirm to the modal footer.
 */
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js module shared with the browser host bundle
import { renderProjectPickerModalBody } from "../clients/viewer/src/browser-host/render.js";

const globals = globalThis as Record<string, unknown>;
let restore: Record<string, unknown> | null = null;

const payload = {
  state: "ok",
  root: "/Users/op",
  path: "Documents",
  selectedPath: "/Users/op/Documents",
  parentPath: "",
  entries: [
    { name: ".cache", path: "Documents/.cache", hasLogics: false, hidden: true },
    { name: ".config", path: "Documents/.config", hasLogics: false, hidden: true },
    { name: "logics-manager", path: "Documents/logics-manager", hasLogics: true, hidden: false }
  ]
};

function bodyIn(html = "") {
  const dom = new JSDOM(`<!doctype html><body><div id="body">${html}</div></body>`);
  restore = { document: globals.document, HTMLElement: globals.HTMLElement, window: globals.window };
  globals.document = dom.window.document;
  globals.HTMLElement = dom.window.HTMLElement;
  globals.window = dom.window;
  return { dom, body: dom.window.document.getElementById("body")! };
}

afterEach(() => {
  if (restore) {
    Object.assign(globals, restore);
    restore = null;
  }
});

describe("the fallback folder picker explains what it is choosing", () => {
  it("names the current folder and the purpose the caller gave it", () => {
    const { body } = bodyIn();

    renderProjectPickerModalBody(body, payload, {
      purpose: "A fleet root is a folder whose immediate subfolders are your projects."
    });

    expect(body.textContent).toContain("Current folder");
    expect(body.textContent).toContain("/Users/op/Documents");
    expect(body.textContent).toContain("immediate subfolders are your projects");
  });

  it("hides dot-folders by default and says how many, without removing access", () => {
    const { body } = bodyIn();

    renderProjectPickerModalBody(body, payload, { purpose: "" });

    expect(body.querySelectorAll("[data-viewer-project-picker-open]")).toHaveLength(2); // parent + one project
    expect(body.textContent).toContain("Show hidden folders (2)");
    expect(body.querySelector("[data-viewer-project-picker-hidden]")).toBeTruthy();

    renderProjectPickerModalBody(body, payload, { purpose: "", showHidden: true });

    expect(body.querySelectorAll("[data-viewer-project-picker-open]")).toHaveLength(4);
    expect((body.querySelector("[data-viewer-project-picker-hidden]") as HTMLInputElement).checked).toBe(true);
  });

  it("leaves the confirm to the modal footer so the body cannot select anything", () => {
    const { body } = bodyIn();

    renderProjectPickerModalBody(body, payload, { purpose: "" });

    expect(body.querySelector("[data-viewer-project-picker-select]")).toBeNull();
    expect(body.textContent).toContain("Parent folder");
  });
});

describe("each picker states its own purpose and confirmation", () => {
  const host = require("node:fs").readFileSync("clients/viewer/src/browser-host/index.js", "utf8") as string;

  it("distinguishes a discovery root from an individual project", () => {
    expect(host).toContain('confirmLabel: "Use as fleet root"');
    expect(host).toContain('confirmLabel: "Open this project"');
    expect(host).toContain("A fleet root is a folder whose immediate subfolders are your projects.");
    expect(host).toContain("This folder is opened as one project.");
  });

  it("keeps Cancel and Close purely dismissive", () => {
    const start = host.indexOf("async function openFolderPickerModal(");
    const fn = host.slice(start, host.indexOf("\n  }\n", start));
    expect(fn).toContain('modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close)');
    expect(fn).toContain('modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close)');
    expect(fn).not.toContain('.viewer-themed-modal__submit")?.addEventListener("click", close)');
  });
});
