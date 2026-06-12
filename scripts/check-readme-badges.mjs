import { readFileSync } from "node:fs";

const readme = readFileSync("README.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const version = readFileSync("VERSION", "utf8").trim();

const expected = [
  {
    label: "version",
    value: `v${version}`,
    pattern: /img\.shields\.io\/badge\/version-(v[^-\s)]+)-/
  },
  {
    label: "VS Code",
    value: packageJson.engines.vscode.replace(/^\^/, ""),
    pattern: /img\.shields\.io\/badge\/VS%20Code-([^-\s?)]+)/
  },
  {
    label: "TypeScript",
    value: packageJson.devDependencies.typescript.replace(/^[^\d]*/, ""),
    pattern: /img\.shields\.io\/badge\/TypeScript-([^-\s?)]+)/
  },
  {
    label: "Vitest",
    value: packageJson.devDependencies.vitest.replace(/^[^\d]*/, ""),
    pattern: /img\.shields\.io\/badge\/Vitest-([^-\s?)]+)/
  }
];

const failures = [];
if (packageJson.version !== version) {
  failures.push(`package.json version ${packageJson.version} does not match VERSION ${version}`);
}

for (const badge of expected) {
  const match = readme.match(badge.pattern);
  const actual = match?.[1] || "";
  if (actual !== badge.value) {
    failures.push(`README ${badge.label} badge is ${actual || "missing"}, expected ${badge.value}`);
  }
}

if (failures.length > 0) {
  console.error("README badge metadata drift:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("README badge metadata: OK");
