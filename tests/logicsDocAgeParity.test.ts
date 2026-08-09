import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_STALE_AFTER_DAYS,
  ageInDays,
  gitLastChangeTimes,
  indexLogics,
  readStaleAfterDays
} from "../clients/vscode/src/logicsIndexer";

/**
 * Documents were dated from filesystem mtime here while the CLI dated them from
 * the commit history, and this client applied its own hardcoded thirty-day
 * staleness threshold against the CLI's configurable fourteen. The same
 * document could be stale in one surface and current in the other.
 */

const temporaryRoots: string[] = [];

function makeRepo(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-age-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "test@example.invalid"]);
  git(root, ["config", "user.name", "Test"]);
  return root;
}

function git(root: string, args: string[], dateIso?: string): void {
  execFileSync("git", args, {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: dateIso ?? "",
      GIT_COMMITTER_DATE: dateIso ?? "",
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.invalid",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.invalid"
    }
  });
}

function writeDoc(root: string, ref: string, status = "Draft"): string {
  const relPath = path.join("logics", "request", `${ref}.md`);
  fs.writeFileSync(
    path.join(root, relPath),
    `## ${ref} - ${ref}\n> Schema version: 1.0\n> Status: ${status}\n\n# Needs\n- Something.\n`,
    "utf8"
  );
  return relPath.split(path.sep).join("/");
}

function commit(root: string, message: string, daysAgo = 0): void {
  const stamp = new Date(Date.now() - daysAgo * 86400000).toISOString();
  git(root, ["add", "-A"], stamp);
  git(root, ["commit", "-q", "-m", message], stamp);
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const root = temporaryRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
    }
  }
});

describe("document age", () => {
  it("dates a document from its commit, not from the checkout", () => {
    const root = makeRepo();
    const relPath = writeDoc(root, "req_001_old");
    commit(root, "add", 40);

    const times = gitLastChangeTimes(root);
    expect(times.has(relPath)).toBe(true);
    expect(ageInDays(times.get(relPath))).toBeGreaterThanOrEqual(39);
  });

  it("survives a fresh clone, where every file shares one mtime", () => {
    const root = makeRepo();
    writeDoc(root, "req_002_older");
    commit(root, "older", 60);
    writeDoc(root, "req_003_newer");
    commit(root, "newer", 5);

    const clone = fs.mkdtempSync(path.join(os.tmpdir(), "logics-clone-"));
    temporaryRoots.push(clone);
    execFileSync("git", ["clone", "-q", root, clone], { stdio: "ignore" });

    const items = indexLogics(clone);
    const older = items.find((item) => item.id === "req_002_older");
    const newer = items.find((item) => item.id === "req_003_newer");
    expect(older?.updatedAt).not.toEqual(newer?.updatedAt);
    expect(older?.ageDays ?? 0).toBeGreaterThan(newer?.ageDays ?? 0);
  });

  it("falls back to the filesystem for an uncommitted document", () => {
    const root = makeRepo();
    writeDoc(root, "req_004_untracked");
    const item = indexLogics(root).find((entry) => entry.id === "req_004_untracked");
    expect(item?.updatedAt).toBeTruthy();
    expect(item?.ageDays).toBe(0);
  });

  it("returns no dates for a directory that is not a repository", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-nogit-"));
    temporaryRoots.push(root);
    fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
    writeDoc(root, "req_005_nogit");
    expect(gitLastChangeTimes(root).size).toBe(0);
    expect(indexLogics(root)[0]?.ageDays).toBe(0);
  });
});

describe("staleness threshold", () => {
  it("defaults to the documented value when no config is present", () => {
    const root = makeRepo();
    expect(readStaleAfterDays(root)).toBe(DEFAULT_STALE_AFTER_DAYS);
    expect(DEFAULT_STALE_AFTER_DAYS).toBe(14);
  });

  it("reads the project's configured threshold", () => {
    const root = makeRepo();
    fs.writeFileSync(path.join(root, "logics.yaml"), "health:\n  stale_after_days: 45\n", "utf8");
    expect(readStaleAfterDays(root)).toBe(45);
  });

  it("keeps the default when the value is unusable", () => {
    const root = makeRepo();
    fs.writeFileSync(path.join(root, "logics.yaml"), "health:\n  stale_after_days: nope\n", "utf8");
    expect(readStaleAfterDays(root)).toBe(DEFAULT_STALE_AFTER_DAYS);
  });

  it("ignores an unrelated key of the same name", () => {
    const root = makeRepo();
    fs.writeFileSync(path.join(root, "logics.yaml"), "other:\n  stale_after_days: 99\n", "utf8");
    expect(readStaleAfterDays(root)).toBe(DEFAULT_STALE_AFTER_DAYS);
  });
});

describe("agreement with the CLI", () => {
  it("reports the same age the CLI reports for the same document", () => {
    const root = makeRepo();
    const relPath = writeDoc(root, "req_010_shared");
    commit(root, "add", 25);

    const fromClient = indexLogics(root).find((item) => item.relPath === relPath)?.ageDays;
    const cliOutput = execFileSync(
      "python3",
      ["-c", "import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[1]);"
        + "from logics_manager.doc_parsing import git_last_change_times,last_change_time,age_in_days;"
        + "print(age_in_days(last_change_time(Path(sys.argv[2]),sys.argv[3],git_last_change_times(Path(sys.argv[2])))))",
        process.cwd(), root, relPath],
      { encoding: "utf8" }
    ).trim();

    expect(String(fromClient)).toBe(cliOutput);
  });
});
