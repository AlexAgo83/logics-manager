import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packageName = packageJson.name;
const version = packageJson.version;
const packageRef = `${packageName}@${version}`;

function npmViewExists() {
  try {
    execFileSync("npm", ["view", packageRef, "version"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}

if (npmViewExists()) {
  process.stdout.write(`${packageRef} already exists on npm; skipping publish.\n`);
  process.exit(0);
}

if (process.env.GITHUB_ACTIONS === "true") {
  process.stdout.write("Publishing via GitHub Actions trusted publishing/OIDC.\n");
}

// item_773: the check runs here because this is the last point at which the artifact still
// exists and the release has not happened. A check in CI protects a pipeline; a check here
// protects the package. Measured warm on this repository: 0.8s for the npm package, which
// is why all three artifacts are checked on their own publish paths rather than one being
// traded away for speed.
execFileSync(process.execPath, [path.join(root, "scripts", "check-artifact-contents.mjs"), "npm package"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});

execFileSync("npm", ["publish", "--access", "public"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit"
});
