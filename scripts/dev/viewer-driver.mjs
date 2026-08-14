/**
 * Driving a live viewer from a headless browser: the one copy both dev scripts use.
 *
 * item_780: `viewer-tour.mjs` grew these, and the README-capture script needed exactly
 * the same six things -- start a viewer on a free port, find a Chrome, launch it without
 * touching the operator's Keychain, speak CDP to it, evaluate in the page, wait for a
 * condition. A second copy would have been the third way of pointing a browser at this
 * viewer in one repository, and the first to drift.
 *
 * `artifactsDir` is where a caller's throwaway Chrome profiles go; it is passed in rather
 * than assumed, because the two callers write to different places.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { WebSocket } from "ws";

const repoRoot = process.cwd();
let artifactsDir = join(repoRoot, "artifacts");

/** Where throwaway Chrome profiles are written. Set once, by the caller, before use. */
export function useArtifactsDir(directory) {
  artifactsDir = directory;
}

export async function startViewer() {
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

export function findChrome() {
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

export async function startChrome(chrome, viewport) {
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

export async function stopChrome(browser) {
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

export function connectCdp(wsUrl) {
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

export async function evaluate(cdp, expression) {
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

export async function waitFor(predicate, label, debug = () => "", timeoutMs = 15_000) {
  const started = Date.now();
  // Awaited. An async predicate returns a Promise, which is always truthy, so the
  // un-awaited form exited on the first turn and every caller believed its condition had
  // been met instantly. It produced four README captures of an empty board.
  while (!(await predicate())) {
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
