/**
 * req_340/item_702: a guard that only exists in CI is found after the push.
 *
 * `check_function_length.py` ran from ci.yml and from no local entry point, so a
 * function grown past its ledger entry was discovered after a push -- which is how it
 * was found during the 2.21.7 cycle. Compounding it, `core.hooksPath` was still
 * configured to `.githooks/`, deleted in 0038628b, so no hook had run since June and
 * nothing said so.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

describe("local guard reachability", () => {
  it("runs every CI source guard from npm run lint", () => {
    const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
    // The guard CI runs directly, rather than through an npm script.
    expect(ci).toContain("scripts/check_function_length.py");

    expect(packageJson.scripts["check:function-length"]).toContain("check_function_length.py");
    expect(packageJson.scripts.lint).toContain("check:function-length");
    expect(packageJson.scripts.lint).toContain("check:line-budget");
  });

  it("names the guard where a contributor is told what to run", () => {
    expect(fs.readFileSync("docs/development.md", "utf8")).toContain("npm run check:function-length");
  });

  it("configures no hooks path that does not exist", () => {
    // Whatever `prepare` does on install, it must not point git at a missing directory.
    expect(packageJson.scripts.prepare ?? "").not.toContain(".githooks");
    expect(packageJson.scripts["setup-hooks"]).toBeUndefined();
    expect(fs.existsSync(".githooks")).toBe(false);
  });
});

describe("the retired hooks-path cleanup", () => {
  function repoWith(hooksPath: string | null): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "hookspath-"));
    execFileSync("git", ["init", "-q"], { cwd: root });
    if (hooksPath) {
      execFileSync("git", ["config", "--local", "core.hooksPath", hooksPath], { cwd: root });
    }
    return root;
  }

  function run(cwd: string): void {
    execFileSync("node", [path.resolve("scripts/dev/clear-retired-hooks-path.mjs")], { cwd, stdio: "ignore" });
  }

  function hooksPathOf(root: string): string | null {
    try {
      return execFileSync("git", ["config", "--local", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  }

  it("clears the stale value this repository used to set", () => {
    const root = repoWith(".githooks");

    run(root);

    expect(hooksPathOf(root)).toBeNull();
  });

  it("leaves a hooks path the contributor set themselves alone", () => {
    const root = repoWith(".my-own-hooks");

    run(root);

    expect(hooksPathOf(root)).toBe(".my-own-hooks");
  });

  it("leaves `.githooks` alone when it actually exists", () => {
    // Someone may legitimately create it again; only the dangling case is ours to fix.
    const root = repoWith(".githooks");
    fs.mkdirSync(path.join(root, ".githooks"));

    run(root);

    expect(hooksPathOf(root)).toBe(".githooks");
  });

  it("does nothing in a repository that never set one", () => {
    const root = repoWith(null);

    run(root);

    expect(hooksPathOf(root)).toBeNull();
  });
});
