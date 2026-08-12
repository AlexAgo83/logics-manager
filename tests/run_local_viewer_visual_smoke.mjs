import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { WebSocket } from "ws";
import { layoutChecks } from "./helpers/viewer-layout-checks.mjs";
import { filterChecks } from "./helpers/viewer-filter-checks.mjs";

const repoRoot = process.cwd();
// Redirectable so the campaign's own regression test does not overwrite a real run's report.
const artifactsDir = process.env.VIEWER_CAMPAIGN_OUT
  ? (isAbsolute(process.env.VIEWER_CAMPAIGN_OUT) ? process.env.VIEWER_CAMPAIGN_OUT : join(repoRoot, process.env.VIEWER_CAMPAIGN_OUT))
  : join(repoRoot, "artifacts", "local-viewer-smoke");
mkdirSync(artifactsDir, { recursive: true });

const allViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 }
];
// Narrowing the sweep keeps the campaign's own regression test to one viewport instead
// of three. A run that skips viewports says so in the report rather than silently
// reporting less than it looks like it did.
const requested = (process.env.VIEWER_CAMPAIGN_VIEWPORTS || "").split(",").map((name) => name.trim()).filter(Boolean);
const viewports = requested.length ? allViewports.filter((viewport) => requested.includes(viewport.name)) : allViewports;
// Drives the "a failed check does not end the run" property from outside the page.
const injectFailure = process.env.VIEWER_CAMPAIGN_INJECT_FAILURE === "1";

// Every check the run performed, in order, each with a verdict and the value it
// measured. The campaign used to raise on the first failure, so one defect hid every
// check behind it and a reviewer learned one fact per run.
const checks = [];

function record(name, verdict, measured, detail) {
  checks.push({ name, verdict, measured, ...(detail ? { detail } : {}) });
  return checks[checks.length - 1];
}

/** A check that could not run is not a check that failed: a missing prerequisite is not a defect. */
function skip(name, reason) {
  return record(name, "skipped", reason);
}

const viewer = await startViewer();
let mode = "none";
if (viewer.skipped) {
  console.warn(viewer.reason);
  skip("viewer starts", viewer.reason);
} else {
  try {
    const chrome = findChrome();
    const windowsCiServerOnly = process.platform === "win32" && process.env.CI === "true";
    mode = windowsCiServerOnly ? "server" : chrome ? "chrome" : "jsdom";
    if (windowsCiServerOnly) {
      await runServerSmoke(viewer.url);
    } else if (chrome) {
      await runChromeSmoke(chrome, viewer.url);
    } else {
      await runJsdomFallback(viewer.url);
    }
  } finally {
    viewer.process.kill();
  }
}

for (const viewport of allViewports.filter((entry) => !viewports.includes(entry))) {
  skip(`${viewport.name}: whole viewport`, "not requested by VIEWER_CAMPAIGN_VIEWPORTS");
}
writeReport({ url: viewer.url ?? null, mode, checks });
const failed = checks.filter((check) => check.verdict === "failed");
if (failed.length) {
  console.error(`Viewer campaign: ${failed.length} check(s) failed. See ${join(artifactsDir, "report.txt")}`);
  // The report file is not an artifact CI uploads, so a failure would otherwise leave
  // nothing to diagnose from the log itself.
  for (const check of failed) {
    console.error(`- ${check.name}: ${check.detail ?? check.measured ?? "no detail"}`);
  }
  process.exitCode = 1;
}

function writeReport({ url, mode, checks }) {
  writeFileSync(join(artifactsDir, "summary.json"), JSON.stringify({ url, mode, checks }, null, 2));
  const width = Math.max(0, ...checks.map((check) => check.name.length));
  const lines = [
    "Viewer UI campaign",
    `url: ${url ?? "(not started)"}`,
    `mode: ${mode}`,
    "",
    ...checks.map(
      (check) =>
        `${check.verdict === "ok" ? "OK  " : check.verdict === "failed" ? "KO  " : "--  "}` +
        `${check.name.padEnd(width)}  ${check.measured ?? ""}`
    ),
    ""
  ];
  const failures = checks.filter((check) => check.verdict === "failed");
  if (failures.length) {
    lines.push("Findings:");
    // A KO is a defect OR a stale expectation. The measured value is what decides which,
    // so it is printed beside every verdict rather than only on failure.
    for (const failure of failures) {
      lines.push(`- ${failure.name}: ${failure.detail ?? failure.measured ?? "no detail"}`);
    }
  } else {
    lines.push("No findings. A run with zero findings is not a pass on its own: open the captures.");
  }
  writeFileSync(join(artifactsDir, "report.txt"), lines.join("\n") + "\n");
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
    const match = text.match(/(?:Local:|Reusing the viewer already running .* at)\s+(http:\/\/[^\s]+)/);
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

async function runChromeSmoke(chrome, url) {
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
      const loaded = cdp.waitFor("Page.loadEventFired");
      await cdp.send("Page.navigate", { url });
      await withTimeout(loaded, `${viewport.name} page load`, 30_000);
      const result = await evaluate(cdp, browserExerciseScript(viewport.name));
      for (const check of result.checks || []) {
        record(`${viewport.name}: ${check.name}`, check.verdict, check.measured, check.detail);
      }
      if (result.html) {
        writeFileSync(join(artifactsDir, `${viewport.name}-failure.html`), result.html);
      }
      // The captures are written on a failing run too: they are what a reviewer opens to
      // tell a defect from a stale expectation.
      const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      writeFileSync(join(artifactsDir, `${viewport.name}.png`), Buffer.from(screenshot.data, "base64"));
      record(
        `${viewport.name}: console is clean`,
        errors.length ? "failed" : "ok",
        `${errors.length} error/warning(s)`,
        errors.join("\n") || undefined
      );
      cdp.close();
    } finally {
      await stopChrome(browser);
    }
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

async function runServerSmoke(url) {
  const htmlResponse = await fetch(url);
  const html = await htmlResponse.text();
  const shellOk = htmlResponse.ok && html.includes('id="board"') && html.includes('id="viewer-meta"');
  record("server: viewer shell is served", shellOk ? "ok" : "failed", `${html.length} bytes, status ${htmlResponse.status}`);
  const itemsResponse = await fetch(new URL("/api/items", url));
  const items = await itemsResponse.json();
  const payloadOk = itemsResponse.ok && items?.ok && Array.isArray(items?.payload?.items);
  record(
    "server: item payload is valid",
    payloadOk ? "ok" : "failed",
    payloadOk ? `${items.payload.items.length} item(s)` : `status ${itemsResponse.status}`
  );
  for (const viewport of viewports) {
    skip(`${viewport.name}: rendered checks`, "server-only pass, no browser available");
  }
  writeFileSync(join(artifactsDir, "windows-ci-server.html"), html);
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

function cleanupChromeProfile(userDataDir) {
  try {
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  } catch (error) {
    console.warn(`Could not remove temporary Chrome profile ${userDataDir}: ${error.message}`);
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
      if (event === "click" && typeof node.click === "function") {
        node.click();
        return node;
      }
      node.dispatchEvent(new MouseEvent(event, { bubbles: true, view: window }));
      return node;
    };
    const waitFor = async (predicate, label, timeoutMs = 30000) => {
      const started = Date.now();
      while (!predicate()) {
        if (Date.now() - started > timeoutMs) throw new Error(${JSON.stringify(name)} + ": Timed out waiting for " + label);
        await delay(75);
      }
    };
    const LAYOUT_CHECKS = (${layoutChecks.toString()})(window);
    const FILTER_CHECKS = (${filterChecks.toString()})(window);
    const checks = [];
    // A failing check no longer ends the run. Later checks may depend on it and fail in
    // turn -- that is reported too, and reads as one cause rather than one fact per run.
    const check = async (name, run) => {
      try {
        checks.push({ name, verdict: "ok", measured: String(await run() ?? "") });
      } catch (error) {
        checks.push({ name, verdict: "failed", measured: "", detail: error.message });
      }
    };
    (async () => {
      if (window.acquireVsCodeApi) window.acquireVsCodeApi().postMessage({ type: "ready" });
      if (${injectFailure ? "true" : "false"}) {
        await check("injected failure", () => { throw new Error("injected on purpose"); });
      }
      await check("payload arrives", async () => {
        await waitFor(() => text("#viewer-filter-count").includes("docs shown"), "payload");
        return text("#viewer-filter-count").trim();
      });
      await check("board shows cards", async () => {
        if (document.querySelectorAll(".card[data-id]").length === 0) {
          const focus = document.querySelector('[data-viewer-filter-group="focus"]');
          if (focus instanceof HTMLSelectElement) {
            focus.value = "all";
            focus.dispatchEvent(new Event("change", { bubbles: true }));
          } else {
            const allDocs = document.querySelector('[data-viewer-focus-value="all"]');
            if (allDocs instanceof HTMLElement) allDocs.click();
          }
        }
        await waitFor(() => document.querySelectorAll(".card[data-id]").length > 0, "cards");
        return document.querySelectorAll(".card[data-id]").length + " card(s)";
      });
      for (const [label, selector] of [["topbar", ".viewer-topbar"], ["repo pill", "#viewer-repo-pill"], ["board", "#board"], ["details", "#details"]]) {
        await check(label + " is not blank", () => {
          const value = text(selector).trim();
          if (!value) throw new Error(selector + " rendered blank");
          return value.length + " chars";
        });
      }
      await check("a card opens its document", async () => {
        click(".card[data-id]");
        click('[data-action="read"]');
        await waitFor(() => !document.getElementById("viewer-document").hidden && text("#viewer-document-content").trim(), "read preview");
        return text("#viewer-document-title").trim();
      });
      await check("insights renders", async () => {
        click("#viewer-insights");
        await waitFor(() => text("#viewer-document-content").includes("Flow health"), "insights", 120000);
        return "Flow health";
      });
      await check("health renders", async () => {
        click("#viewer-health");
        await waitFor(() => text("#viewer-document-content").includes("Validation findings"), "health");
        return "Validation findings";
      });
      await check("refresh reports what it did", async () => {
        const auto = document.getElementById("viewer-auto-refresh");
        auto.checked = false;
        auto.dispatchEvent(new Event("change", { bubbles: true }));
        auto.checked = true;
        auto.dispatchEvent(new Event("change", { bubbles: true }));
        click('[data-action="refresh"]');
        await waitFor(() => /refreshed|no viewer changes/.test(text("#viewer-meta")), "refresh");
        return text("#viewer-meta").trim();
      });
      await check("activity entry opens its document", async () => {
        click("#activity-toggle");
        await delay(150);
        const activityPanel = document.getElementById("activity-panel");
        const entry = activityPanel && !activityPanel.hidden ? document.querySelector(".activity-panel__entry") : null;
        if (!entry) return "no activity entry to open";
        entry.dispatchEvent(new MouseEvent("click", { bubbles: true, view: window }));
        entry.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, view: window }));
        await waitFor(() => !document.getElementById("viewer-document").hidden, "activity read");
        return "opened";
      });
      for (const layoutCheck of LAYOUT_CHECKS) {
        await check(layoutCheck.name, layoutCheck.run);
      }
      for (const filterCheck of FILTER_CHECKS) {
        await check(filterCheck.name, filterCheck.run);
      }
      const failed = checks.some((entry) => entry.verdict === "failed");
      resolve({ checks, html: failed ? document.documentElement.outerHTML : "" });
    })().catch((error) => resolve({
      checks: [...checks, { name: "campaign completes", verdict: "failed", measured: "", detail: error.message }],
      html: document.documentElement.outerHTML
    }));
  })`;
}

async function runJsdomFallback(url) {
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
      try {
        await waitFor(() => dom.window.document.readyState === "complete", `${viewport.name} load`);
        dom.window.acquireVsCodeApi?.().postMessage({ type: "ready" });
        await waitFor(() => text(dom, "#viewer-filter-count").includes("docs shown"), `${viewport.name} payload`);
        record(`${viewport.name}: payload renders`, "ok", text(dom, "#viewer-filter-count").trim());
      } catch (error) {
        record(`${viewport.name}: payload renders`, "failed", "no payload", error.message);
      }
      writeFileSync(join(artifactsDir, `${viewport.name}.html`), dom.serialize());
      record(
        `${viewport.name}: console is clean`,
        browserErrors.length ? "failed" : "ok",
        `${browserErrors.length} error(s)`,
        browserErrors.join("\n") || undefined
      );
      // The headless DOM lays nothing out, so every geometry check is unmeasurable here
      // rather than passing by default.
      skip(`${viewport.name}: layout checks`, "headless DOM performs no layout");
    } finally {
      dom.window.close();
    }
  }
}

function text(dom, selector) {
  return dom.window.document.querySelector(selector)?.textContent || "";
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

function withTimeout(promise, label, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
