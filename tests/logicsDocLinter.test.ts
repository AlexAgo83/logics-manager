import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];

function makeRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function cleanupRoots() {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}

function git(root: string, args: string[]) {
  execFileSync("git", args, {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Codex",
      GIT_AUTHOR_EMAIL: "codex@example.com",
      GIT_COMMITTER_NAME: "Codex",
      GIT_COMMITTER_EMAIL: "codex@example.com"
    },
    stdio: "ignore"
  });
}

function initRepoWithRequestDoc(markedMaintenance = false) {
  const root = makeRoot("logics-linter-");
  fs.mkdirSync(path.join(root, "logics", "request"), { recursive: true });
  fs.writeFileSync(path.join(root, ".gitignore"), "node_modules\n", "utf8");
  const docPath = path.join(root, "logics", "request", "req_001_demo.md");
  fs.writeFileSync(
    docPath,
    [
      "## req_001_demo - Demo request",
      "> From version: 1.26.1",
      "> Understanding: 90%",
      "> Confidence: 90%",
      "> Status: Draft",
      "",
      "# Context",
      "- Initial wording."
    ].join("\n"),
    "utf8"
  );
  git(root, ["init", "-q"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "Initial"]);

  const extraLines = markedMaintenance
    ? [
        "",
        "# Notes",
        "> Maintenance edit: refreshed wording only.",
        "- Updated prose without changing scope."
      ]
    : [
        "",
        "# Notes",
        "- Updated prose without changing scope."
      ];
  fs.appendFileSync(docPath, extraLines.join("\n"), "utf8");
  return { root, docPath };
}

function runLinter(root: string) {
  return spawnSync("python3", [path.join(process.cwd(), "logics/skills/logics-doc-linter/scripts/logics_lint.py"), "--require-status", "--format", "json"], {
    cwd: root,
    encoding: "utf8",
    env: process.env
  });
}

afterEach(() => {
  cleanupRoots();
});

describe("logics-doc-linter", () => {
  it("allows non-semantic workflow edits when explicitly marked as maintenance", () => {
    const { root } = initRepoWithRequestDoc(true);

    const result = runLinter(root);
    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout || "{}") as { ok?: boolean; issues?: Array<{ message: string }> };
    expect(payload.ok).toBe(true);
    expect(payload.issues || []).toHaveLength(0);
  });

  it("still requires indicator updates for modified workflow docs without a maintenance marker", () => {
    const { root } = initRepoWithRequestDoc(false);

    const result = runLinter(root);
    expect(result.status).not.toBe(0);
    const payload = JSON.parse(result.stdout || "{}") as { ok?: boolean; issues?: Array<{ message: string }> };
    expect(payload.ok).toBe(false);
    expect(payload.issues?.some((issue) => issue.message.includes("modified without updating indicators"))).toBe(true);
  });
});
