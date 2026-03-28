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
  ]
]);

const auditResult = spawnSync(npmCommand(), ["audit", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8"
});

if (auditResult.error) {
  console.error(auditResult.error.message);
  process.exit(1);
}

const rawOutput = auditResult.stdout || "";
let parsed;
try {
  parsed = JSON.parse(rawOutput);
} catch (error) {
  console.error("Failed to parse `npm audit --json` output.");
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
