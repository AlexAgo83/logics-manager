import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { WebSocket } from "ws";

const repoRoot = process.cwd();
const artifactsDir = join(repoRoot, "artifacts", "local-viewer-smoke");
mkdirSync(artifactsDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 }
];

const viewer = await startViewer();
try {
  const chrome = findChrome();
  const results = chrome ? await runChromeSmoke(chrome, viewer.url) : await runJsdomFallback(viewer.url);
  writeFileSync(join(artifactsDir, "summary.json"), JSON.stringify({ url: viewer.url, mode: chrome ? "chrome" : "jsdom", results }, null, 2));
} finally {
  viewer.process.kill();
}

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
  await waitFor(() => Boolean(url), "viewer URL", () => output.join(""));
  return { process: child, url };
}

function findChrome() {
  if (process.env.LOCAL_VIEWER_SMOKE_FORCE_JSDOM === "1") {
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

async function runChromeSmoke(chrome, url) {
  const results = [];
  for (const viewport of viewports) {
    const browser = await startChrome(chrome, viewport);
    try {
      const cdp = await connectCdp(browser.pageWsUrl);
      const errors = [];
      cdp.on("Runtime.exceptionThrown", (event) => errors.push(event.exceptionDetails?.text || "Runtime exception"));
      cdp.on("Log.entryAdded", (event) => {
        if (["error", "warning"].includes(event.entry?.level)) {
          errors.push(event.entry.text);
        }
      });
      await cdp.send("Runtime.enable");
      await cdp.send("Log.enable");
      await cdp.send("Page.enable");
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 700
      });
      await cdp.send("Page.navigate", { url });
      await cdp.waitFor("Page.loadEventFired");
      const result = await evaluate(cdp, browserExerciseScript(viewport.name));
      if (!result.ok) {
        writeFileSync(join(artifactsDir, `${viewport.name}-failure.html`), result.html || "");
        throw new Error(`${viewport.name}: ${result.error || "smoke failed"}`);
      }
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(join(artifactsDir, `${viewport.name}.png`), Buffer.from(screenshot.data, "base64"));
      if (errors.length) {
        throw new Error(`${viewport.name}: browser errors:\n${errors.join("\n")}`);
      }
      results.push({ viewport, ...result });
      cdp.close();
    } finally {
      browser.process.kill();
    }
  }
  return results;
}

async function startChrome(chrome, viewport) {
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--window-size=${viewport.width},${viewport.height}`,
    "about:blank"
  ];
  if (process.platform !== "darwin") {
    args.unshift("--no-sandbox");
  }
  const child = spawn(chrome, args, { stdio: ["ignore", "pipe", "pipe"] });
  let wsUrl = "";
  const output = [];
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    output.push(text);
    const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      wsUrl = match[1];
    }
  });
  await waitFor(() => Boolean(wsUrl), "Chrome DevTools URL", () => output.join(""));
  const port = Number(new URL(wsUrl).port);
  const pageWsUrl = await waitForPageTarget(port);
  return { process: child, pageWsUrl };
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

function browserExerciseScript(name) {
  return `new Promise((resolve) => {
    const delay = (ms) => new Promise((done) => setTimeout(done, ms));
    const text = (selector) => document.querySelector(selector)?.textContent || "";
    const click = (selector, event = "click") => {
      const node = document.querySelector(selector);
      if (!node) throw new Error("Missing " + selector);
      node.dispatchEvent(new MouseEvent(event, { bubbles: true, view: window }));
      return node;
    };
    const waitFor = async (predicate, label) => {
      const started = Date.now();
      while (!predicate()) {
        if (Date.now() - started > 10000) throw new Error("Timed out waiting for " + label);
        await delay(75);
      }
    };
    (async () => {
      if (window.acquireVsCodeApi) window.acquireVsCodeApi().postMessage({ type: "ready" });
      await waitFor(() => document.querySelectorAll(".card[data-id]").length > 0, "cards");
      if (!text(".viewer-topbar").trim()) throw new Error("topbar blank");
      if (!text("#viewer-repo-pill").trim()) throw new Error("repo pill blank");
      if (!text("#board").trim()) throw new Error("board blank");
      if (!text("#details").trim()) throw new Error("details blank");
      click(".card[data-id]");
      click('[data-action="read"]');
      await waitFor(() => !document.getElementById("viewer-document").hidden && text("#viewer-document-content").trim(), "read preview");
      click("#viewer-insights");
      await waitFor(() => text("#viewer-document-content").includes("Flow health"), "insights");
      click("#viewer-health");
      await waitFor(() => text("#viewer-document-content").includes("Validation findings"), "health");
      const auto = document.getElementById("viewer-auto-refresh");
      auto.checked = false;
      auto.dispatchEvent(new Event("change", { bubbles: true }));
      auto.checked = true;
      auto.dispatchEvent(new Event("change", { bubbles: true }));
      click('[data-action="refresh"]');
      await waitFor(() => text("#viewer-meta").includes("refreshed"), "refresh");
      click("#activity-toggle");
      await waitFor(() => document.querySelectorAll(".activity-panel__entry").length > 0, "activity entries");
      const entry = document.querySelector(".activity-panel__entry");
      entry.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
      entry.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, view: window }));
      await waitFor(() => !document.getElementById("viewer-document").hidden, "activity read");
      resolve({ ok: true, name: ${JSON.stringify(name)}, cards: document.querySelectorAll(".card[data-id]").length, title: text("#viewer-document-title") });
    })().catch((error) => resolve({ ok: false, error: error.message, html: document.documentElement.outerHTML }));
  })`;
}

async function runJsdomFallback(url) {
  const results = [];
  for (const viewport of viewports) {
    const browserErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) => browserErrors.push(error.message));
    const dom = await JSDOM.fromURL(url, {
      resources: "usable",
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
        window.matchMedia = (query) => ({
          matches: /\(\s*max-width\s*:\s*(\d+)px\s*\)/.test(query)
            ? viewport.width <= Number(query.match(/\d+/)?.[0] || 0)
            : false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false
        });
        window.fetch = (input, init) => fetch(new URL(String(input), window.location.href), init);
        window.scrollTo = () => undefined;
      }
    });
    try {
      await waitFor(() => dom.window.document.readyState === "complete", `${viewport.name} load`);
      dom.window.acquireVsCodeApi?.().postMessage({ type: "ready" });
      await waitFor(() => text(dom, "#viewer-filter-count").includes("docs shown"), `${viewport.name} payload`);
      writeFileSync(join(artifactsDir, `${viewport.name}.html`), dom.serialize());
      if (browserErrors.length) {
        throw new Error(`${viewport.name}: ${browserErrors.join("\n")}`);
      }
      results.push({ viewport, fallback: true, filterCount: text(dom, "#viewer-filter-count") });
    } finally {
      dom.window.close();
    }
  }
  return results;
}

function text(dom, selector) {
  return dom.window.document.querySelector(selector)?.textContent || "";
}

async function waitFor(predicate, label, debug = () => "") {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 15_000) {
      throw new Error(`Timed out waiting for ${label}.\n${debug()}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
