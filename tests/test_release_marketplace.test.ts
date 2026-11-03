import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(readFileSync(".github/workflows/release.yml", "utf8"));
const step = workflow.jobs["publish-marketplace"].steps.find(
  (entry: { name: string }) => entry.name === "Publish to VS Code Marketplace"
);
const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const duplicate = `${manifest.publisher}.cdx-logics-vscode v${manifest.version} already exists.`;

describe("Marketplace publish workflow", () => {
  it("uses the packaged Marketplace name instead of the npm package name", () => {
    const packaging = readFileSync("scripts/build/package-vscode-extension.mjs", "utf8");
    expect(packaging).toContain('const EXTENSION_NAME = "cdx-logics-vscode";');
    expect(step.run).toContain(".cdx-logics-vscode");
  });

  it("keeps the token exclusively in the existing environment binding", () => {
    expect(step.env).toEqual({ VSCE_PAT: "${{ secrets.VSCE_PAT }}" });
    expect(step.run).not.toContain("VSCE_PAT");
  });

  // The publication job runs on Ubuntu; exercise its actual Bash with fake commands.
  describe.skipIf(process.platform === "win32")("retry behavior", () => {
    function publish(messages: string[], codes: number[], sleeps: number) {
      const prelude = `
        calls=0
        npx() {
          calls=$((calls + 1))
          node -e 'const m = JSON.parse(process.env.MESSAGES); console.log(m[Number(process.argv[1]) - 1] ?? "unexpected attempt")' "$calls"
          return "$(node -e 'console.log(JSON.parse(process.env.CODES)[Number(process.argv[1]) - 1] ?? 99)' "$calls")"
        }
        sleep() { printf 'sleep:%s\\n' "$1" >&3; }
      `;
      const result = spawnSync("bash", ["-e", "-o", "pipefail", "-c", prelude + step.run], {
        encoding: "utf8",
        env: { ...process.env, MESSAGES: JSON.stringify(messages), CODES: JSON.stringify(codes) },
        stdio: ["ignore", "pipe", "pipe", "pipe"]
      });
      expect(result.error).toBeUndefined();
      expect(result.stdout).toBe(messages.join("\n") + "\n");
      expect(result.stderr).toBe("");
      expect(result.output[3]?.toString()).toBe("sleep:60\n".repeat(sleeps));
      return result.status;
    }

    it("stops after the first success", () => {
      expect(publish(["published"], [0], 0)).toBe(0);
    });

    it.each(["ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNREFUSED", "EAI_AGAIN", "ENOTFOUND", "ENETUNREACH", "EHOSTUNREACH", "EPIPE", "socket hang up"])(
      "retries %s and succeeds on the third attempt", (error) => {
        expect(publish([error, error, "published"], [1, 1, 0], 2)).toBe(0);
      }
    );

    it("preserves failure after three network errors", () => {
      expect(publish(["read ECONNRESET", "read ECONNRESET", "read ECONNRESET"], [7, 7, 7], 2)).toBe(7);
    });

    it.each(["Invalid credentials", "Invalid package", "already exists", duplicate.replace(manifest.version, "0.0.0"), duplicate.replace(manifest.publisher, "another-publisher"), duplicate.replace("cdx-logics-vscode", manifest.name)])(
      "fails immediately for %s", (error) => {
        expect(publish([error], [2], 0)).toBe(2);
      }
    );

    it("stops when a retry encounters a non-network error", () => {
      expect(publish(["read ECONNRESET", "Invalid credentials"], [1, 2], 1)).toBe(2);
    });

    it("accepts the exact duplicate on a rerun", () => {
      expect(publish([` ERROR  ${duplicate}`], [1], 0)).toBe(0);
    });

    it("accepts the exact duplicate after a lost publish response", () => {
      expect(publish(["read ECONNRESET", ` ERROR  ${duplicate}`], [1, 1], 1)).toBe(0);
    });
  });
});
