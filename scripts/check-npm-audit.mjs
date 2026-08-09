import { spawnSync } from "node:child_process";

const severityRank = new Map([
  ["info", 0],
  ["low", 1],
  ["moderate", 2],
  ["high", 3],
  ["critical", 4]
]);

const blockingSeverity = "moderate";
const allowedPackages = new Map([
  [
    "esbuild",
    "Tracked by item_203: only present through the Vitest/Vite dev-server chain, which is not shipped in the extension runtime."
  ],
  [
    "vite",
    "Tracked by item_203: wrapper package for the same Vitest/Vite dev-server advisory chain."
  ],
  [
    "vite-node",
    "Tracked by item_203: wrapper package for the same Vitest/Vite dev-server advisory chain."
  ],
  [
    "vitest",
    "Tracked by item_203: direct entrypoint for the same Vitest/Vite dev-server advisory chain."
  ],
  [
    "@vitest/mocker",
    "Tracked by item_203: wrapper package for the same Vitest/Vite dev-server advisory chain."
  ],
  [
    "@vscode/vsce",
    "Temporary exception: release/publish tooling only; not shipped in the extension runtime."
  ],
  [
    "@azure/identity",
    "Temporary exception: only reachable through @vscode/vsce release tooling."
  ],
  [
    "@azure/msal-node",
    "Temporary exception: only reachable through @vscode/vsce release tooling."
  ],
  [
    "mermaid",
    "Temporary exception: bundled preview asset; tracked until the Mermaid dependency chain can be refreshed."
  ],
  [
    "postcss",
    "Temporary exception: only reachable through the Vitest/Vite toolchain, which is dev-only."
  ],
  [
    "uuid",
    "Temporary exception: advisory currently hits both the Mermaid preview asset chain and the Azure auth tooling chain."
  ]
]);

const auditResult = spawnSync(npmCommand(), ["audit", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: process.platform === "win32"
});

if (auditResult.error) {
  console.error(auditResult.error.message);
  process.exit(1);
}

const rawOutput = auditResult.stdout || "";
const rawError = auditResult.stderr || "";
let parsed;
try {
  parsed = JSON.parse(rawOutput);
} catch (error) {
  if (isRegistryUnavailable(rawOutput, rawError)) {
    console.error("Audit policy: registry unavailable. `npm audit --json` could not reach the configured registry, so this is not a clean advisory result.");
    if (rawError.trim()) {
      console.error(rawError.trim());
    }
    process.exit(1);
  }
  console.error("Failed to parse `npm audit --json` output.");
  if (rawOutput.trim()) {
    console.error(rawOutput.trim());
  }
  process.exit(1);
}

if (!parsed || typeof parsed !== "object" || !("auditReportVersion" in parsed) || !("vulnerabilities" in parsed)) {
  if (isRegistryUnavailable(rawOutput, rawError, parsed)) {
    console.error("Audit policy: registry unavailable. `npm audit --json` could not reach the configured registry, so this is not a clean advisory result.");
    if (rawError.trim()) {
      console.error(rawError.trim());
    }
    process.exit(1);
  }
  console.error("`npm audit --json` did not return an audit report.");
  if (rawError.trim()) {
    console.error(rawError.trim());
  }
  if (rawOutput.trim()) {
    console.error(rawOutput.trim());
  }
  process.exit(1);
}

const vulnerabilities = Object.entries(parsed.vulnerabilities || {});
const blocking = [];
const allowed = [];

for (const [packageName, detail] of vulnerabilities) {
  const severity = detail?.severity || "info";
  if ((severityRank.get(severity) ?? 0) < (severityRank.get(blockingSeverity) ?? 0)) {
    continue;
  }

  const entry = {
    packageName,
    severity,
    reason: allowedPackages.get(packageName) || null,
    via: Array.isArray(detail?.via)
      ? detail.via
          .map((value) => (typeof value === "string" ? value : value?.title || value?.url || value?.name))
          .filter(Boolean)
      : []
  };

  if (entry.reason) {
    allowed.push(entry);
    continue;
  }

  blocking.push(entry);
}

if (allowed.length > 0) {
  console.log("Allowed audit findings under the current vulnerability policy:");
  for (const entry of allowed) {
    const viaSummary = entry.via.length > 0 ? ` via ${entry.via.join("; ")}` : "";
    console.log(`- ${entry.packageName} (${entry.severity})${viaSummary}`);
    console.log(`  ${entry.reason}`);
  }
}

if (blocking.length > 0) {
  console.error("Blocking audit findings under the current vulnerability policy:");
  for (const entry of blocking) {
    const viaSummary = entry.via.length > 0 ? ` via ${entry.via.join("; ")}` : "";
    console.error(`- ${entry.packageName} (${entry.severity})${viaSummary}`);
  }
  process.exit(1);
}

console.log("Audit policy: OK");

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function isRegistryUnavailable(stdout, stderr, parsedPayload = null) {
  const code = typeof parsedPayload?.error?.code === "string" ? parsedPayload.error.code.toLowerCase() : "";
  const summary = `${stdout || ""}\n${stderr || ""}`.toLowerCase();
  const summaryTokens = new Set(summary.split(/[^a-z0-9.-]+/).filter(Boolean));
  return (
    ["enotfound", "eai_again", "econnreset", "econnrefused", "etimedout", "enetunreach"].includes(code) ||
    summaryTokens.has("registry.npmjs.org") && (
      summary.includes("enotfound") ||
      summary.includes("eai_again") ||
      summary.includes("econnreset") ||
      summary.includes("econnrefused") ||
      summary.includes("etimedout") ||
      summary.includes("network")
    )
  );
}
