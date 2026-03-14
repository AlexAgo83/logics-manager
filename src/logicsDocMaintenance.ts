import * as fs from "fs";
import * as path from "path";

export type RenameTarget = {
  immutablePrefix: string;
  suffix: string;
};

export function parseRenameTarget(id: string): RenameTarget | null {
  const match = id.match(/^(req|item|task|prod|adr)_(\d+)(?:_(.+))?$/);
  if (!match) {
    return null;
  }
  return {
    immutablePrefix: `${match[1]}_${match[2]}_`,
    suffix: match[3] ?? ""
  };
}

export function validateRenameSuffix(value: string, parsed: RenameTarget, currentPath: string): string | undefined {
  const raw = value.trim();
  if (!raw) {
    return "Name suffix is required.";
  }
  if (raw.includes("/") || raw.includes("\\")) {
    return "Use a name, not a path.";
  }
  const normalized = normalizeEntrySuffix(raw);
  if (!normalized) {
    return "Use letters or numbers.";
  }
  const nextId = `${parsed.immutablePrefix}${normalized}`;
  const nextPath = path.join(path.dirname(currentPath), `${nextId}.md`);
  if (fs.existsSync(nextPath) && nextPath !== currentPath) {
    return "Another entry already uses this name.";
  }
  return undefined;
}

export function normalizeEntrySuffix(value: string): string {
  return slugify(value.trim());
}

export function replaceManagedReferenceTokens(
  content: string,
  oldRelPath: string,
  newRelPath: string,
  oldId: string,
  newId: string
): { changed: boolean; content: string } {
  let changed = false;
  const oldNormalized = normalizePathToken(oldRelPath);

  const withCodeTokens = content.replace(/`([^`]+)`/g, (fullMatch, rawToken: string) => {
    const token = rawToken.trim();
    if (token === oldId) {
      changed = true;
      return `\`${newId}\``;
    }
    if (normalizePathToken(token) === oldNormalized) {
      changed = true;
      return `\`${newRelPath}\``;
    }
    return fullMatch;
  });

  const withMarkdownLinks = withCodeTokens.replace(/\]\(([^)]+)\)/g, (fullMatch, rawTarget: string) => {
    const target = rawTarget.trim();
    if (normalizePathToken(target) !== oldNormalized) {
      return fullMatch;
    }
    changed = true;
    return `](${newRelPath})`;
  });

  return { changed, content: withMarkdownLinks };
}

export function addLinkToSection(
  content: string,
  sectionTitle: "References" | "Used by",
  linkPath: string
): { changed: boolean; content: string } {
  const normalizedLink = linkPath.replace(/\\/g, "/").trim();
  if (!normalizedLink) {
    return { changed: false, content };
  }

  const lines = content.split(/\r?\n/);
  const section = findSection(lines, sectionTitle);

  if (!section) {
    const suffix = content.endsWith("\n") ? "" : "\n";
    const appended = `${content}${suffix}\n# ${sectionTitle}\n- \`${normalizedLink}\`\n`;
    return { changed: true, content: appended };
  }

  const sectionLines = lines.slice(section.start, section.end);
  const existingLinks = sectionLines
    .flatMap((line) => Array.from(line.matchAll(/`([^`]+)`/g)).map((match) => (match[1] || "").trim()))
    .map((entry) => entry.replace(/\\/g, "/"));

  if (existingLinks.includes(normalizedLink)) {
    return { changed: false, content };
  }

  const cleanedSectionLines = sectionLines.filter((line) => !line.includes("(none yet)"));
  while (cleanedSectionLines.length > 0 && cleanedSectionLines[cleanedSectionLines.length - 1].trim() === "") {
    cleanedSectionLines.pop();
  }
  cleanedSectionLines.push(`- \`${normalizedLink}\``);

  const updatedLines = [...lines.slice(0, section.start), ...cleanedSectionLines, ...lines.slice(section.end)];
  return { changed: true, content: `${updatedLines.join("\n")}\n` };
}

function findSection(
  lines: string[],
  sectionTitle: "References" | "Used by"
): { start: number; end: number } | null {
  const expected = `# ${sectionTitle}`.toLowerCase();
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().toLowerCase() !== expected) {
      continue;
    }
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j].startsWith("# ")) {
        end = j;
        break;
      }
    }
    return { start: i + 1, end };
  }
  return null;
}

function normalizePathToken(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, 40);
}
