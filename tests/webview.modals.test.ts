import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

function loadModalsDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const absPath = path.resolve(process.cwd(), "clients/shared-web/media/webviewModals.js");
  const source = fs.readFileSync(absPath, "utf8");
  new vm.Script(source, { filename: absPath }).runInContext(dom.getInternalVMContext());
  return dom;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("webview modals", () => {
  it("submits prompt values and removes the modal", async () => {
    const dom = loadModalsDom();
    const promise = dom.window.logicsViewerModals.prompt({
      title: "Project root",
      message: "Enter a root path",
      defaultValue: "/workspace",
      placeholder: "path/to/project",
      submitLabel: "Use root"
    });
    await flush();

    const input = dom.window.document.querySelector(".logics-modal__input") as HTMLInputElement | null;
    expect(input?.value).toBe("/workspace");
    input!.value = "/repo";
    dom.window.document.querySelector("form")?.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    await expect(promise).resolves.toBe("/repo");
    expect(dom.window.document.querySelector(".logics-modal")).toBeNull();
  });

  it("resolves confirm false on cancel and true on submit", async () => {
    const cancelDom = loadModalsDom();
    const cancelPromise = cancelDom.window.logicsViewerModals.confirm({
      title: "Mark done",
      message: "Mark item as done?",
      submitLabel: "Mark done",
      cancelLabel: "Keep open"
    });
    await flush();
    expect(cancelDom.window.document.querySelector(".logics-modal")?.textContent).toContain("Mark item as done?");
    (cancelDom.window.document.querySelector(".logics-modal__button--secondary") as HTMLButtonElement | null)?.click();
    await expect(cancelPromise).resolves.toBe(false);

    const submitDom = loadModalsDom();
    const submitPromise = submitDom.window.logicsViewerModals.confirm({ title: "Continue" });
    await flush();
    submitDom.window.document.querySelector("form")?.dispatchEvent(new submitDom.window.Event("submit", { bubbles: true, cancelable: true }));
    await expect(submitPromise).resolves.toBe(true);
  });

  it("collects request draft fields and handles Escape", async () => {
    const dom = loadModalsDom();
    const promise = dom.window.logicsViewerModals.requestDraft();
    await flush();

    const controls = Array.from(dom.window.document.querySelectorAll("input, textarea")) as Array<HTMLInputElement | HTMLTextAreaElement>;
    expect(controls.map((control) => control.name)).toEqual(["title", "intent", "context"]);
    controls[0].value = "Improve viewer";
    controls[1].value = "Make request creation easier";
    controls[2].value = "Keep it accessible";
    dom.window.document.querySelector("form")?.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));

    await expect(promise).resolves.toEqual({
      title: "Improve viewer",
      intent: "Make request creation easier",
      context: "Keep it accessible"
    });

    const escapeDom = loadModalsDom();
    const escapePromise = escapeDom.window.logicsViewerModals.requestDraft();
    await flush();
    escapeDom.window.document.dispatchEvent(new escapeDom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(escapePromise).resolves.toBeNull();
  });
});
