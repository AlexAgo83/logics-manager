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
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { WebSocket } from "ws";

const repoRoot = process.cwd();
const out = join(repoRoot, "artifacts", "viewer-tour");
const artifactsDir = out;
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

async function startViewer() {
  const python = process.platform === "win32" ? "python" : "python3";
  const child = spawn(python, ["-m", "logics_manager", "view", "--port", "0", "--no-open", "--refresh-interval", "60"], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output = [];
  let url = "";
  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    output.push(text);
    const match = text.match(/Local:\s+(http:\/\/[^\s]+)/);
    if (match) {
      url = match[1];
    }
  });
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));
  try {
    await waitFor(() => Boolean(url), "viewer URL", () => output.join(""));
  } catch (error) {
    const debugOutput = output.join("");
    child.kill();
    if (isSocketBindUnavailable(debugOutput)) {
      return { skipped: true, reason: "Skipping local viewer visual smoke because this environment cannot bind a localhost socket." };
    }
    throw error;
  }
  return { process: child, url };
}

function isSocketBindUnavailable(output) {
  return output.includes("PermissionError")
    && output.includes("Operation not permitted")
    && output.includes("socket.bind");
}

function findChrome() {
  if (process.env.LOCAL_VIEWER_SMOKE_FORCE_JSDOM === "1") {
    return "";
  }
  if (process.platform === "win32" && process.env.CI === "true") {
    return "";
  }
  const candidates = process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium", "chromium-browser"]
    : process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "chrome",
          "chrome.exe",
          "msedge",
          "msedge.exe"
        ]
      : ["google-chrome", "chromium", "chromium-browser", "chrome"];
  for (const candidate of candidates) {
    if (isAbsolute(candidate) && existsSync(candidate)) {
      return candidate;
    }
    if (!isAbsolute(candidate) && spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) {
      return candidate;
    }
  }
  return "";
}

async function startChrome(chrome, viewport) {
  const userDataDir = join(artifactsDir, `chrome-profile-${viewport.name}-${process.pid}-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank"
  ];
  if (process.platform !== "darwin") {
    args.unshift("--no-sandbox");
  } else {
    // A headless Chrome still reaches for the macOS Keychain, which interrupts a local
    // run with an authorization dialog about Chrome Safe Storage. The mock keychain is
    // Chromium's documented answer for test launches; it also keeps this browser away
    // from real saved passwords, which a campaign has no business touching.
    args.unshift("--use-mock-keychain", "--disable-features=DialMediaRouteProvider");
  }
  const child = spawn(chrome, args, { stdio: ["ignore", "pipe", "pipe"] });
  let wsUrl = "";
  const output = [];
  const captureDevToolsOutput = (chunk) => {
    const text = chunk.toString();
    output.push(text);
    const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      wsUrl = match[1];
    }
  };
  child.stdout.on("data", captureDevToolsOutput);
  child.stderr.on("data", captureDevToolsOutput);
  try {
    await waitFor(() => Boolean(wsUrl), "Chrome DevTools URL", () => output.join(""), 30_000);
    const port = Number(new URL(wsUrl).port);
    const pageWsUrl = await waitForPageTarget(port);
    return { process: child, pageWsUrl, userDataDir };
  } catch (error) {
    child.kill();
    cleanupChromeProfile(userDataDir);
    throw error;
  }
}

async function stopChrome(browser) {
  const child = browser.process;
  if (!child.killed) {
    child.kill();
  }
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  cleanupChromeProfile(browser.userDataDir);
}

function cleanupChromeProfile(userDataDir) {
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (error) {
    console.warn(`Could not remove temporary Chrome profile ${userDataDir}: ${error.message}`);
  }
}

function connectCdp(wsUrl) {
  let id = 0;
  const callbacks = new Map();
  const listeners = new Map();
  const socket = new WebSocket(wsUrl);
  socket.addEventListener("message", (message) => {
    const payload = JSON.parse(message.data);
    if (payload.id && callbacks.has(payload.id)) {
      const { resolve, reject } = callbacks.get(payload.id);
      callbacks.delete(payload.id);
      payload.error ? reject(new Error(payload.error.message)) : resolve(payload.result || {});
      return;
    }
    const handlers = listeners.get(payload.method) || [];
    handlers.forEach((handler) => handler(payload.params || {}));
  });
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const requestId = ++id;
          socket.send(JSON.stringify({ id: requestId, method, params }));
          return new Promise((requestResolve, requestReject) => callbacks.set(requestId, { resolve: requestResolve, reject: requestReject }));
        },
        waitFor(method) {
          return new Promise((eventResolve) => {
            const handlers = listeners.get(method) || [];
            handlers.push(eventResolve);
            listeners.set(method, handlers);
          });
        },
        on(method, handler) {
          const handlers = listeners.get(method) || [];
          handlers.push(handler);
          listeners.set(method, handlers);
        },
        close() {
          socket.close();
        }
      });
    });
    socket.addEventListener("error", reject);
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
}

async function waitFor(predicate, label, debug = () => "", timeoutMs = 15_000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for ${label}.\n${debug()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function waitForPageTarget(port) {
  let last = "";
  const started = Date.now();
  while (Date.now() - started < 15_000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      last = await response.text();
      const targets = JSON.parse(last);
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) {
        return page.webSocketDebuggerUrl;
      }
    } catch (error) {
      last = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for Chrome page target.\n${last}`);
}
