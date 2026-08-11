/**
 * Remove the `core.hooksPath` this repository used to set, and nothing else.
 *
 * `npm install` configured `core.hooksPath=.githooks` for a pre-commit hook that
 * guarded the committed `viewer_assets` mirror (req_262). When the mirror became
 * generated, the hook was deleted with the rest of that tooling (0038628b) and the
 * config was left behind -- so every clone since has pointed git at a directory that
 * does not exist, silently running no hooks and blocking any future one.
 *
 * Only our own stale value is cleared. A contributor who deliberately points
 * `core.hooksPath` somewhere of their own keeps it: unsetting another tool's config on
 * every install is the same overreach that created this, in the other direction.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const RETIRED = ".githooks";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const configured = git(["config", "--local", "--get", "core.hooksPath"]);
if (configured === RETIRED && !existsSync(resolve(process.cwd(), RETIRED))) {
  git(["config", "--local", "--unset-all", "core.hooksPath"]);
  console.log(`[hooks] cleared core.hooksPath=${RETIRED} (the hook it pointed at was retired in 0038628b)`);
}
