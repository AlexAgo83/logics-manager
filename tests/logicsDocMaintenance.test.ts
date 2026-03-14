import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addLinkToSection,
  normalizeEntrySuffix,
  parseRenameTarget,
  replaceManagedReferenceTokens,
  validateRenameSuffix
} from "../src/logicsDocMaintenance";

const tempRoots: string[] = [];

function mkTempDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-doc-maintenance-"));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("logicsDocMaintenance", () => {
  it("parses rename targets for primary and companion docs", () => {
    expect(parseRenameTarget("req_022_plugin_alignment")).toEqual({
      immutablePrefix: "req_022_",
      suffix: "plugin_alignment"
    });
    expect(parseRenameTarget("prod_000_companion_docs")).toEqual({
      immutablePrefix: "prod_000_",
      suffix: "companion_docs"
    });
    expect(parseRenameTarget("adr_000_plugin_model")).toEqual({
      immutablePrefix: "adr_000_",
      suffix: "plugin_model"
    });
    expect(parseRenameTarget("spec_001_traceability")).toBeNull();
  });

  it("normalizes and validates rename suffixes", () => {
    const root = mkTempDir();
    const currentPath = path.join(root, "logics", "product", "prod_001_old_name.md");
    fs.mkdirSync(path.dirname(currentPath), { recursive: true });
    fs.writeFileSync(currentPath, "## prod_001_old_name - Old Name\n", "utf8");

    const parsed = parseRenameTarget("prod_001_old_name");
    expect(parsed).not.toBeNull();
    expect(normalizeEntrySuffix("  New Plugin UX  ")).toBe("new_plugin_ux");
    expect(validateRenameSuffix("", parsed!, currentPath)).toBe("Name suffix is required.");
    expect(validateRenameSuffix("foo/bar", parsed!, currentPath)).toBe("Use a name, not a path.");

    const collidingPath = path.join(root, "logics", "product", "prod_001_new_plugin_ux.md");
    fs.writeFileSync(collidingPath, "## prod_001_new_plugin_ux - Collision\n", "utf8");
    expect(validateRenameSuffix("New Plugin UX", parsed!, currentPath)).toBe("Another entry already uses this name.");
  });

  it("rewrites companion doc ids and paths inside managed references", () => {
    const updated = replaceManagedReferenceTokens(
      [
        "Derived from `logics/product/prod_000_old_flow.md`",
        "- `prod_000_old_flow`",
        "- `./logics/product/prod_000_old_flow.md`",
        "[Open brief](logics/product/prod_000_old_flow.md)"
      ].join("\n"),
      "logics/product/prod_000_old_flow.md",
      "logics/product/prod_000_new_flow.md",
      "prod_000_old_flow",
      "prod_000_new_flow"
    );

    expect(updated.changed).toBe(true);
    expect(updated.content).toContain("`logics/product/prod_000_new_flow.md`");
    expect(updated.content).toContain("`prod_000_new_flow`");
    expect(updated.content).toContain("](logics/product/prod_000_new_flow.md)");
    expect(updated.content).not.toContain("prod_000_old_flow");
  });

  it("adds companion doc links to sections without duplicating entries", () => {
    const original = [
      "## item_025_plugin_details - Plugin details",
      "# References",
      "- (none yet)",
      "",
      "# Used by",
      "- `logics/tasks/task_021_align_vs_code_plugin_with_companion_docs_workflow.md`"
    ].join("\n");

    const withReference = addLinkToSection(original, "References", "logics/architecture/adr_000_plugin_model.md");
    expect(withReference.changed).toBe(true);
    expect(withReference.content).toContain("`logics/architecture/adr_000_plugin_model.md`");
    expect(withReference.content).not.toContain("(none yet)");

    const duplicate = addLinkToSection(withReference.content, "References", "logics/architecture/adr_000_plugin_model.md");
    expect(duplicate.changed).toBe(false);
  });
});
