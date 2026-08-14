/**
 * Attended viewer campaign: a scripted walk of every screen, plus the first minute an
 * operator actually spends in the viewer.
 *
 * This is not a test and asserts nothing. It measures and captures, so a human can read
 * the result: how long each screen takes to say it has loaded, what it offers, what it
 * leaves empty, and what the console said while it happened. The automated campaign
 * (`npm run test:viewer-smoke`) is the gate; this is the pass that finds what a gate
 * cannot -- a screen that opens onto someone else's screen, a number that stops counting,
 * a normal project logged as a client error.
 *
 *   node scripts/dev/viewer-tour.mjs
 *
 * Output: artifacts/viewer-tour/ -- one capture per screen, tour.json, notes.json.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// item_780: the browser driving moved to viewer-driver.mjs, which the README-capture
// script uses too. One copy, so the keychain-safe launch flags cannot drift apart.
import {
  connectCdp, evaluate, findChrome, startChrome, startViewer, stopChrome, useArtifactsDir, waitFor
} from "./viewer-driver.mjs";

const repoRoot = process.cwd();
const out = join(repoRoot, "artifacts", "viewer-tour");
useArtifactsDir(out);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const TARGETS = ["workshop:terminals","workshop:commands","workshop:explorer","project:translations","project:theme",
  "remote:git","remote:runs","remote:release","cdx:status","cdx:missions","cdx:runs","cdx:history","cdx:memory","cdx:disk"];

const viewer = await startViewer();
const chrome = findChrome();
const browser = await startChrome(chrome, { name: "tour", width: 1440, height: 900 });
const cdp = await connectCdp(browser.pageWsUrl);
const errors = [];
cdp.on("Runtime.exceptionThrown", (e) => errors.push(e.exceptionDetails?.text || "exception"));
cdp.on("Log.entryAdded", (e) => { if (["error","warning"].includes(e.entry?.level)) errors.push(e.entry.text); });
await cdp.send("Runtime.enable"); await cdp.send("Log.enable"); await cdp.send("Page.enable");
await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp.send("Page.navigate", { url: viewer.url });
await cdp.waitFor("Page.loadEventFired");
await evaluate(cdp, "new Promise(r => setTimeout(r, 3500))");

cdp.on("Network.responseReceived", (e) => { if (e.response.status >= 400) errors.push(`${e.response.status} ${e.response.url}`); });
await cdp.send("Network.enable");
const rows = [];
async function shot(name) {
  const s = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(out, `${name}.png`), Buffer.from(s.data, "base64"));
}
await shot("00-board");
rows.push(await evaluate(cdp, `(() => {
  const t = (s) => document.querySelector(s)?.textContent?.trim() || "";
  return { screen: "board", title: t("#viewer-document-title"), cards: document.querySelectorAll(".card[data-id]").length,
    count: t("#viewer-filter-count"), actions: document.querySelectorAll("[data-action]").length,
    disabled: document.querySelectorAll("button[disabled],[aria-disabled=true]").length };
})()`));

for (const target of TARGETS) {
  const before = Date.now();
  const nav = await evaluate(cdp, `(() => {
    const node = document.querySelector('[data-viewer-nav-target="${target}"]');
    if (!node) return { missing: true };
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
    return { missing: false };
  })()`);
  if (nav?.missing) { rows.push({ screen: target, missing: true }); continue; }
  const settled = await evaluate(cdp, `(async () => {
    const started = Date.now();
    const meta = () => document.getElementById("viewer-meta")?.textContent || "";
    while (Date.now() - started < 8000) {
      if (/loaded|refreshed|ready|available|detected|state:|no /i.test(meta())) return Date.now() - started;
      await new Promise((r) => setTimeout(r, 40));
    }
    return -1;
  })()`);
  await evaluate(cdp, "new Promise(r => setTimeout(r, 400))");
  const info = await evaluate(cdp, `(() => {
    const t = (s) => document.querySelector(s)?.textContent?.trim() || "";
    const content = document.getElementById("viewer-document-content");
    const text = content?.textContent?.trim() || "";
    const empties = Array.from(content?.querySelectorAll("*") || [])
      .filter((n) => n.children.length === 0 && !n.textContent.trim() && n.getBoundingClientRect().height > 20).length;
    return {
      title: t("#viewer-document-title"), meta: t("#viewer-meta"),
      chars: text.length, firstWords: text.slice(0, 110).replace(/\\s+/g, " "),
      actions: content?.querySelectorAll("button, [role=button], [data-action]").length || 0,
      disabled: content?.querySelectorAll("button[disabled],[aria-disabled=true]").length || 0,
      disabledSilent: Array.from(content?.querySelectorAll("button[disabled],[aria-disabled=true]") || [])
        .filter((n) => !(n.title || n.getAttribute("aria-label") || "").trim()).length,
      emptyBoxes: empties,
      tables: content?.querySelectorAll("table").length || 0,
      scrollHeight: content?.scrollHeight || 0
    };
  })()`);
  rows.push({ screen: target, settledMs: settled, ...info });
  await shot(target.replace(":", "-"));
}
writeFileSync(join(out, "tour.json"), JSON.stringify({ rows, errors }, null, 2));
console.table(rows.filter((r) => r.screen !== "board").map(({ screen, settledMs, title, chars, actions, emptyBoxes }) => ({ screen, settledMs, title, chars, actions, emptyBoxes })));

const notes = [];
const note = (k, v) => { notes.push([k, v]); console.log(k, "|", v); };

// A tester's first minute: land, find work, open a document, search, filter, shrink.
note("landing view", await evaluate(cdp, `document.getElementById("activity-panel") && !document.getElementById("activity-panel").hidden ? "activity feed" : "board"`));
note("banner", await evaluate(cdp, `(document.querySelector(".viewer-banner, [class*=warning]")?.textContent || "").trim().slice(0,90)`));
note("board cards before switching", await evaluate(cdp, `document.querySelectorAll(".card[data-id]").length`));

await evaluate(cdp, `document.getElementById("activity-toggle")?.click()`);
await evaluate(cdp, "new Promise(r=>setTimeout(r,900))");
note("after Project toggle: cards", await evaluate(cdp, `document.querySelectorAll(".card[data-id]").length`));
note("after Project toggle: columns", await evaluate(cdp, `document.querySelectorAll("#board .column, #board [class*=column]").length`));
await shot("10-project-board");

const openMs = await evaluate(cdp, `(async () => {
  const started = Date.now();
  document.querySelector(".card[data-id]")?.click();
  document.querySelector('[data-action="read"]')?.click();
  while (Date.now() - started < 8000) {
    const c = document.getElementById("viewer-document-content");
    if (c && c.textContent.trim().length > 200) return Date.now() - started;
    await new Promise(r=>setTimeout(r,40));
  }
  return -1;
})()`);
note("open a document (ms)", openMs);
await shot("11-document");
note("document actions offered", await evaluate(cdp, `document.querySelectorAll("#viewer-document [data-action], #viewer-document button").length`));

const demoSwitch = await evaluate(cdp, `(async () => {
  document.getElementById("viewer-repo-pill")?.click();
  await new Promise(r=>setTimeout(r,500));
  const demo = Array.from(document.querySelectorAll("[data-viewer-project-id]"))
    .find((node) => /Demo board/.test(node.textContent || ""));
  if (!demo) return { switched: false };
  demo.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
  await new Promise(r=>setTimeout(r,1500));
  return { switched: true, label: document.querySelector("[data-viewer-project-label]")?.textContent || "" };
})()`);
note("docs captures project", JSON.stringify(demoSwitch));

await evaluate(cdp, `document.getElementById("viewer-health")?.click()`);
await evaluate(cdp, "new Promise(r=>setTimeout(r,5000))");
await shot("health");
await evaluate(cdp, `document.getElementById("viewer-refresh-menu-button")?.click()`);
await evaluate(cdp, "new Promise(r=>setTimeout(r,300))");
await evaluate(cdp, `document.querySelector('[data-viewer-settings-action="insights"]')?.click()`);
await evaluate(cdp, "new Promise(r=>setTimeout(r,5000))");
await shot("insights");

await evaluate(cdp, `(() => { const i = document.getElementById("viewer-document-close"); if (i) i.click(); })()`);
await evaluate(cdp, "new Promise(r=>setTimeout(r,400))");
const searchMs = await evaluate(cdp, `(async () => {
  const input = document.getElementById("search-input");
  const started = Date.now();
  input.value = "campaign"; input.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise(r=>setTimeout(r,700));
  return { ms: Date.now()-started, cards: document.querySelectorAll(".card[data-id]").length, count: (document.getElementById("viewer-filter-count")||{}).textContent };
})()`);
note("search 'campaign'", JSON.stringify(searchMs));
await shot("12-search");
await evaluate(cdp, `(() => { const i = document.getElementById("search-input"); i.value=""; i.dispatchEvent(new Event("input",{bubbles:true})); })()`);

note("filter panel opens", await evaluate(cdp, `(() => {
  document.getElementById("filter-toggle")?.click();
  const p = document.getElementById("filter-panel");
  return p ? (p.hidden ? "stayed hidden" : "opened") : "no panel";
})()`));
await evaluate(cdp, "new Promise(r=>setTimeout(r,500))");
await shot("13-filters");

await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(cdp, "new Promise(r=>setTimeout(r,900))");
note("mobile: horizontal overflow px", await evaluate(cdp, `document.documentElement.scrollWidth - document.documentElement.clientWidth`));
note("mobile: topbar controls visible", await evaluate(cdp, `Array.from(document.querySelectorAll(".viewer-topbar button")).filter(b=>b.getBoundingClientRect().width>0).length`));
await shot("14-mobile");


writeFileSync(join(out, "notes.json"), JSON.stringify({ notes, errors }, null, 2));
console.log("\nConsole and network problems:", [...new Set(errors)]);
cdp.close();
await stopChrome(browser);
viewer.process.kill();
