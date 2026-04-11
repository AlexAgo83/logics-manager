import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRepoKitSource, existsOrSymlink, inspectPublicationLifecycle, publishSkill } from "../src/logicsGlobalKitLifecycle";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    symlinkSync: vi.fn((target: any, destination: any, type?: any) => {
      if (type === "dir") {
        throw new Error("symlink not supported");
      }
      return actual.symlinkSync(target, destination, type);
    })
  };
});

vi.mock("yaml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("yaml")>();
  return {
    ...actual,
    parseDocument: vi.fn((text: string, options?: Record<string, unknown>) => {
      if (text.includes("throw-me")) {
        throw new Error("forced parse failure");
      }
      return actual.parseDocument(text, options as never);
    })
  };
});

describe("logicsGlobalKitLifecycle", () => {
  const roots: string[] = [];

  afterEach(() => {
    vi.clearAllMocks();
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("covers existsOrSymlink branches", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-"));
    roots.push(root);
    const dangling = path.join(root, "dangling");

    fs.symlinkSync("/nonexistent/target", dangling);

    expect(existsOrSymlink(dangling)).toBe(true);
    expect(existsOrSymlink(path.join(root, "missing"))).toBe(false);
  });

  it("covers readSkillTier fallback paths through buildRepoKitSource", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-"));
    roots.push(root);

    const skillsRoot = path.join(root, "logics", "skills");
    fs.mkdirSync(skillsRoot, { recursive: true });
    fs.writeFileSync(path.join(skillsRoot, "VERSION"), "1.0.0\n", "utf8");

    const malformedSkill = path.join(skillsRoot, "malformed-skill");
    fs.mkdirSync(path.join(malformedSkill, "agents"), { recursive: true });
    fs.writeFileSync(path.join(malformedSkill, "SKILL.md"), "# malformed\n", "utf8");
    fs.writeFileSync(path.join(malformedSkill, "agents", "openai.yaml"), "tier: [\n", "utf8");

    const arraySkill = path.join(skillsRoot, "array-skill");
    fs.mkdirSync(path.join(arraySkill, "agents"), { recursive: true });
    fs.writeFileSync(path.join(arraySkill, "SKILL.md"), "# array\n", "utf8");
    fs.writeFileSync(path.join(arraySkill, "agents", "openai.yaml"), "- one\n- two\n", "utf8");

    const optionalSkill = path.join(skillsRoot, "optional-skill");
    fs.mkdirSync(path.join(optionalSkill, "agents"), { recursive: true });
    fs.writeFileSync(path.join(optionalSkill, "SKILL.md"), "# optional\n", "utf8");
    fs.writeFileSync(path.join(optionalSkill, "agents", "openai.yaml"), 'tier: optional\ninterface:\n  display_name: "Optional"\n', "utf8");

    const throwingSkill = path.join(skillsRoot, "throwing-skill");
    fs.mkdirSync(path.join(throwingSkill, "agents"), { recursive: true });
    fs.writeFileSync(path.join(throwingSkill, "SKILL.md"), "# throwing\n", "utf8");
    fs.writeFileSync(path.join(throwingSkill, "agents", "openai.yaml"), "throw-me\n", "utf8");

    const source = buildRepoKitSource(root);
    const tiers = new Map(source.repoSkills.map((entry) => [entry.name, entry.tier]));

    expect(tiers.get("array-skill")).toBe("core");
    expect(tiers.get("malformed-skill")).toBe("core");
    expect(tiers.get("optional-skill")).toBe("optional");
    expect(tiers.get("throwing-skill")).toBe("core");
  });

  it("covers publishSkill copy fallback and symlink recreation", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-"));
    roots.push(root);

    const source = path.join(root, "source");
    const destination = path.join(root, "destination");
    const innerFile = path.join(source, "SKILL.md");
    const innerLink = path.join(source, "linked.md");
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(innerFile, "# skill\n", "utf8");
    fs.symlinkSync("SKILL.md", innerLink);

    const result = publishSkill(source, destination);

    expect(result).toBe("copy");
    expect(fs.existsSync(destination)).toBe(true);
    expect(fs.lstatSync(path.join(destination, "linked.md")).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(path.join(destination, "linked.md"))).toBe("SKILL.md");
    expect(fs.readFileSync(path.join(destination, "SKILL.md"), "utf8")).toContain("# skill");
  });

  it("covers publication lifecycle missing and stale states", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-"));
    roots.push(root);
    const manifestPath = path.join(root, "global-kit.json");

    expect(
      inspectPublicationLifecycle({
        root,
        manifestPath,
        validateManifest: () => [],
        validateEntries: () => [],
        publishedSkillNames: () => [],
        versionChangeSeverity: "warning",
        versionChangeMessage: () => "version changed",
        revisionChangeSeverity: "warning",
        revisionChangeMessage: () => "revision changed",
        missingVersionSeverity: "issue",
        missingVersionMessage: "missing version"
      }).kind
    ).toBe("missing-manager");

    const skillsRoot = path.join(root, "logics", "skills");
    fs.mkdirSync(path.join(skillsRoot, "core-skill"), { recursive: true });
    fs.writeFileSync(path.join(skillsRoot, "core-skill", "SKILL.md"), "# core\n", "utf8");

    expect(
      inspectPublicationLifecycle({
        root,
        manifestPath,
        validateManifest: () => [],
        validateEntries: () => [],
        publishedSkillNames: () => [],
        versionChangeSeverity: "warning",
        versionChangeMessage: () => "version changed",
        revisionChangeSeverity: "warning",
        revisionChangeMessage: () => "revision changed",
        missingVersionSeverity: "issue",
        missingVersionMessage: "missing version"
      }).kind
    ).toBe("missing-overlay");

    fs.writeFileSync(manifestPath, "{not: valid json", "utf8");

    expect(
      inspectPublicationLifecycle({
        root,
        manifestPath,
        validateManifest: () => [],
        validateEntries: () => [],
        publishedSkillNames: () => [],
        versionChangeSeverity: "warning",
        versionChangeMessage: () => "version changed",
        revisionChangeSeverity: "warning",
        revisionChangeMessage: () => "revision changed",
        missingVersionSeverity: "issue",
        missingVersionMessage: "missing version"
      }).kind
    ).toBe("stale");
  });

  it("covers publication lifecycle present branches and version comparisons", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "logics-kit-"));
    roots.push(root);
    const skillsRoot = path.join(root, "logics", "skills");
    const gitDir = path.join(skillsRoot, ".git");
    const manifestPath = path.join(root, "global-kit.json");
    fs.mkdirSync(path.join(skillsRoot, "core-skill"), { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(skillsRoot, "core-skill", "SKILL.md"), "# core\n", "utf8");
    fs.writeFileSync(path.join(skillsRoot, "VERSION"), "1.4.0\n", "utf8");
    fs.writeFileSync(path.join(gitDir, "HEAD"), "0123456789abcdef0123456789abcdef01234567\n", "utf8");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          installed_version: "1.3.0",
          source_repo: path.resolve(root),
          source_revision: "fedcba9876543210fedcba9876543210fedcba98",
          published_at: "2026-04-01T00:00:00.000Z",
          publication_mode: "copy",
          published_skill_entries: [
            {
              name: "core-skill",
              source_path: path.join(skillsRoot, "core-skill"),
              destination_path: path.join(root, "global", "core-skill"),
              mode: "copy",
              source_mtime_ns: 1
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = inspectPublicationLifecycle({
      root,
      manifestPath,
      validateManifest: (manifest) => (manifest.publication_mode === "copy" ? ["manifest copy mode"] : []),
      validateEntries: (entries) => (entries.length === 1 ? ["one entry"] : []),
      publishedSkillNames: (entries) => entries.map((entry) => entry.name),
      versionChangeSeverity: "warning",
      versionChangeMessage: () => "version changed",
      revisionChangeSeverity: "warning",
      revisionChangeMessage: () => "revision changed",
      missingVersionSeverity: "issue",
      missingVersionMessage: "missing version"
    });

    expect(inspection.kind).toBe("present");
    if (inspection.kind !== "present") {
      throw new Error("Expected present inspection");
    }
    expect(inspection.installedVersion).toBe("1.3.0");
    expect(inspection.sourceRepo).toBe(path.resolve(root));
    expect(inspection.sourceRevision).toBe("fedcba9876543210fedcba9876543210fedcba98");
    expect(inspection.publishedSkillNames).toEqual(["core-skill"]);
    expect(inspection.issues).toContain("manifest copy mode");
    expect(inspection.issues).toContain("one entry");
    expect(inspection.warnings).toContain("version changed");
    expect(inspection.warnings).toContain("revision changed");

    const source = buildRepoKitSource(root);
    expect(source.repoVersion).toBe("1.4.0");
    expect(source.repoRevision).toBe("0123456789abcdef0123456789abcdef01234567");
  });
});
