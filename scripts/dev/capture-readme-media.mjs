/**
 * Produce the four captures the README publishes.
 *
 * item_780: nothing produced these. They were made by hand, and nothing recorded the
 * screen, viewport, corpus or state they were framed at -- which is why they went stale
 * silently through five redesigns, and why the next person recapturing them could not
 * match the framing. This script is that record. It is executable rather than prose
 * because a written procedure drifts from the product exactly as the images did.
 *
 *   node scripts/dev/capture-readme-media.mjs
 *
 * Writes docs/media/*.png, and docs/media/PROVENANCE.md stating how they were taken.
 *
 * Deliberately not a CI job. It needs a real corpus and a running viewer, and images
 * regenerated on every push would churn the repository with pixel differences nobody
 * asked for. Run it when the screens change; the README's captions say when that was.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  connectCdp, evaluate, findChrome, startChrome, startViewer, stopChrome, useArtifactsDir, waitFor
} from "./viewer-driver.mjs";

const repoRoot = process.cwd();
const mediaDir = join(repoRoot, "docs", "media");
const scratch = join(repoRoot, "artifacts", "readme-media");
mkdirSync(mediaDir, { recursive: true });
mkdirSync(scratch, { recursive: true });
useArtifactsDir(scratch);

/**
 * The framing, stated once so it is the same for every capture and reproducible later.
 *
 * 1440x900 is the desktop the campaign already judges layouts at, and a README read on a
 * laptop shows it without scaling. deviceScaleFactor 2 so the text is legible when the
 * image is displayed at half size, which is what GitHub does.
 */
const VIEWPORT = { name: "readme", width: 1440, height: 900, deviceScaleFactor: 2 };

/**
 * What each capture shows and how the viewer is put into that state.
 *
 * `settle` is a state the screen must reach before the shutter, expressed as a selector
 * the screen itself produces -- never a delay. A delay is a guess that becomes wrong on a
 * slower machine, and produces a capture of a screen mid-load.
 */
const CAPTURES = [
  {
    file: "viewer-board.png",
    what: "The board: the flow columns and the reference index beneath them.",
    steps: [],
    settle: ".column[data-stage] .card[data-id]"
  },
  {
    file: "viewer-document.png",
    what: "The reader: a request opened from the details panel, with its contents list.",
    steps: [".card[data-id]", "[data-action='read']"],
    settle: ".markdown-preview--reading .markdown-preview__prose"
  },
  {
    file: "viewer-insights.png",
    what: "Corpus insights: the shape of the corpus and the signals worth acting on.",
    steps: ["#viewer-corpus", "[data-viewer-nav-target='corpus:insights']"],
    settle: ".viewer-insights__section, .viewer-insights__empty"
  },
  {
    // item_798/AC3: the board's other half. A reader who has only ever seen the columns
    // does not know the list exists, and it is where grouping, sorting and the age column
    // live. Last in the list on purpose: it leaves the board in list mode, and every other
    // capture assumes the columns.
    file: "viewer-board-list.png",
    what: "The board in list mode: one row per document, grouped and sortable, with age.",
    steps: ["[data-action='toggle-view-mode']"],
    settle: ".list-view__section .list-view__header"
  }
];

// item_798/AC4: the Validation health capture is gone rather than regenerated. Reported
// directly by the operator as deceptive: it was taken on a corpus whose findings bore no
// relation to what a reader would see, so it advertised a verdict rather than a screen.

const viewer = await startViewer();
if (viewer.skipped) {
  console.error(viewer.reason);
  process.exit(1);
}
const chromePath = findChrome();
if (!chromePath) {
  console.error("No Chrome or Chromium found. These captures are taken from a real browser on purpose.");
  viewer.process.kill();
  process.exit(1);
}

const browser = await startChrome(chromePath, VIEWPORT);
const cdp = await connectCdp(browser.pageWsUrl);
const taken = [];
try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: VIEWPORT.deviceScaleFactor, mobile: false
  });
  await cdp.send("Page.navigate", { url: viewer.url });

  // The corpus, not the demo board: req_343 removed the synthetic corpus from released
  // artifacts, so a capture showing it documents a screen a reader cannot reach.
  const counted = await settleOn(".card[data-id]", "the board to draw this repository's corpus", 120_000);
  console.log(`[readme-media] board ready: ${counted}`);

  // The Activity/Project toggle is a persisted preference, so a viewer started from a
  // profile that last used Activity opens on the feed -- and the first capture, taken
  // from a clean profile, showed the activity feed under a caption reading "board view".
  // Asserted rather than clicked blind: clicking a toggle already in the wanted state
  // moves away from it.
  await evaluate(cdp, `(function(){
    var toggle = document.getElementById("activity-toggle");
    if (toggle && toggle.getAttribute("aria-pressed") === "true") toggle.click();
    return "";
  })()`);
  await settleQuiet();
  await settleOn(".column[data-stage] .card[data-id]", "the flow columns to be the visible view");

  for (const capture of CAPTURES) {
    for (const step of capture.steps) {
      await evaluate(cdp, `document.querySelector(${JSON.stringify(step)})?.click()`);
      await settleQuiet();
    }
    await settleOn(capture.settle, `${capture.file} to be on screen`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(join(mediaDir, capture.file), Buffer.from(shot.data, "base64"));
    taken.push(capture);
    console.log(`[readme-media] wrote docs/media/${capture.file}`);
    // Back to the board, so the next capture starts from the state this list assumes
    // rather than from whatever the previous one left open.
    await evaluate(cdp, `document.getElementById("viewer-document-close")?.click()`);
    await settleQuiet();
  }

  writeFileSync(join(mediaDir, "PROVENANCE.md"), provenance(taken), "utf-8");
  console.log("[readme-media] wrote docs/media/PROVENANCE.md");
} finally {
  // Tolerated: the captures are already on disk by here, and a browser that closed its
  // own socket during teardown would otherwise report the whole run as failed.
  await stopChrome(browser).catch((error) => console.warn(`[readme-media] browser teardown: ${error.message}`));
  viewer.process.kill();
}

/** Wait for a selector the screen itself produces, never for a delay. */
async function settleOn(selector, label, timeoutMs = 60_000) {
  let measured = "";
  await waitFor(
    async () => {
      measured = await evaluate(cdp, `String(document.querySelectorAll(${JSON.stringify(selector)}).length)`);
      return Number(measured) > 0;
    },
    label,
    () => `no ${selector}`,
    timeoutMs
  );
  return `${measured} x ${selector}`;
}

/** Let a click's own rendering finish before asking what is on screen. */
async function settleQuiet() {
  await waitFor(
    async () => (await evaluate(cdp, 'String(document.body.dataset.viewerBusy || "")')) !== "1",
    "the viewer to be idle",
    () => "still busy",
    30_000
  );
}

function provenance(captures) {
  return [
    "# How the README captures are produced",
    "",
    "Written by `scripts/dev/capture-readme-media.mjs`. Do not edit by hand: run the script.",
    "",
    "```",
    "node scripts/dev/capture-readme-media.mjs",
    "```",
    "",
    "## Framing",
    "",
    `- Viewport: ${VIEWPORT.width}x${VIEWPORT.height}, deviceScaleFactor ${VIEWPORT.deviceScaleFactor}.`,
    "- Browser: headless Chrome, launched through `scripts/dev/viewer-driver.mjs`, which is",
    "  also what the attended viewer tour uses. Its launch flags include `--use-mock-keychain`",
    "  so a capture run never prompts for the operator's Keychain.",
    "- Corpus: this repository's own `logics/`, served by `logics-manager view`. Never the",
    "  synthetic demo board -- `req_343` removed it from released artifacts, so a capture of",
    "  it would document a screen a reader cannot reach.",
    "- Each shutter waits on a selector the screen itself produces, never on a delay. A delay",
    "  is a guess that becomes wrong on a slower machine and captures a screen mid-load.",
    "",
    "## What each capture shows",
    "",
    ...captures.map((capture) => `- \`${capture.file}\` — ${capture.what}`),
    "",
    "## Why this is not a CI job",
    "",
    "It needs a real corpus and a running viewer, and images regenerated on every push would",
    "churn the repository with pixel differences nobody asked for. Run it when the screens",
    "change.",
    ""
  ].join("\n");
}
