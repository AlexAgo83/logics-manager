import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packageName = packageJson.name;
const version = packageJson.version;
const packageRef = `${packageName}@${version}`;
const publishToken = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;

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

if (!publishToken) {
  process.stderr.write("Missing NODE_AUTH_TOKEN or NPM_TOKEN for npm publish.\n");
  process.exit(1);
}

execFileSync("npm", ["publish", "--access", "public"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_AUTH_TOKEN: publishToken
  }
});
