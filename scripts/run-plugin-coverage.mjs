import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const target = process.argv[2];

if (target !== "src" && target !== "media") {
  console.error("Usage: node scripts/run-plugin-coverage.mjs <src|media>");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "--coverage"],
  {
    env: {
      ...process.env,
      CDX_PLUGIN_COVERAGE_TARGET: target
    },
    stdio: "inherit"
  }
);

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const coverageDirectory = target === "src" ? "coverage/plugin-src" : "coverage/plugin-media";
const summaryPath = join(process.cwd(), coverageDirectory, "coverage-summary.json");

try {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const total = summary.total || {};
  const lines = total.lines?.pct ?? 0;
  const statements = total.statements?.pct ?? 0;
  const functions = total.functions?.pct ?? 0;
  const branches = total.branches?.pct ?? 0;

  console.log(
    `[plugin coverage:${target}] lines=${lines.toFixed(2)}% statements=${statements.toFixed(2)}% functions=${functions.toFixed(2)}% branches=${branches.toFixed(2)}%`
  );
  if (target === "media") {
    console.log(
      "[plugin coverage:media] reported separately for visibility; the current eval-loaded webview runtime is not used as a gate."
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[plugin coverage:${target}] summary unavailable: ${message}`);
}

process.exit(0);
