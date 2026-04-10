export type GitStatusEntry = {
  indexStatus: string;
  workTreeStatus: string;
  path: string;
};

type ListType = "ul" | "ol";
type ListItem = {
  text: string;
  checkbox?: boolean;
  checked?: boolean;
};
type TableAlignment = "left" | "center" | "right" | null;
type TableBlock = {
  headerCells: string[];
  alignments: TableAlignment[];
  bodyRows: string[][];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeGitPath(value: string): string {
  const trimmed = value.trim().replace(/^"|"$/g, "");
  const renameTarget = trimmed.includes(" -> ") ? trimmed.split(" -> ").pop() || trimmed : trimmed;
  return renameTarget.replace(/\\/g, "/");
}

function renderInlineMarkdown(value: string): string {
  const codeSpans: string[] = [];
  const withPlaceholders = value.replace(/`([^`]+)`/g, (_match, code: string) => {
    const placeholder = `@@CODE_SPAN_${codeSpans.length}@@`;
    codeSpans.push(code);
    return placeholder;
  });

  let rendered = escapeHtml(withPlaceholders);
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    return `<a href="${escapeHtml(href.trim())}">${escapeHtml(label.trim())}</a>`;
  });
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  rendered = rendered.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  for (let i = 0; i < codeSpans.length; i += 1) {
    const placeholder = `@@CODE_SPAN_${i}@@`;
    rendered = rendered.replace(placeholder, `<code>${escapeHtml(codeSpans[i])}</code>`);
  }

  return rendered;
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim();
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaping = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseTableAlignment(cell: string): TableAlignment {
  const trimmed = cell.trim();
  if (!/^:?-{3,}:?$/.test(trimmed)) {
    return null;
  }
  const hasLeft = trimmed.startsWith(":");
  const hasRight = trimmed.endsWith(":");
  if (hasLeft && hasRight) {
    return "center";
  }
  if (hasRight) {
    return "right";
  }
  if (hasLeft) {
    return "left";
  }
  return null;
}

function isTableDividerRow(line: string): boolean {
  const cells = splitTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function parseTableBlock(lines: string[], index: number): TableBlock | null {
  const headerLine = lines[index] || "";
  const dividerLine = lines[index + 1] || "";
  if (!headerLine.includes("|") || !isTableDividerRow(dividerLine)) {
    return null;
  }

  const headerCells = splitTableCells(headerLine);
  const dividerCells = splitTableCells(dividerLine);
  if (headerCells.length === 0 || headerCells.length !== dividerCells.length) {
    return null;
  }

  const bodyRows: string[][] = [];
  let cursor = index + 2;
  while (cursor < lines.length) {
    const line = lines[cursor];
    if (line.trim() === "" || !line.includes("|")) {
      break;
    }
    const cells = splitTableCells(line);
    if (cells.length === 0) {
      break;
    }
    bodyRows.push(cells);
    cursor += 1;
  }

  return {
    headerCells,
    alignments: dividerCells.map((cell) => parseTableAlignment(cell)),
    bodyRows
  };
}

function renderTableBlock(table: TableBlock): string {
  const columnCount = Math.max(
    table.headerCells.length,
    table.alignments.length,
    ...table.bodyRows.map((row) => row.length)
  );
  const columns = Array.from({ length: columnCount }, (_value, columnIndex) => ({
    alignment: table.alignments[columnIndex] || null,
    header: table.headerCells[columnIndex] || ""
  }));

  const renderCell = (tagName: "th" | "td", text: string, alignment: TableAlignment) => {
    const style = alignment ? ` style="text-align:${alignment}"` : "";
    const scope = tagName === "th" ? ' scope="col"' : "";
    return `<${tagName}${scope}${style}>${renderInlineMarkdown(text)}</${tagName}>`;
  };

  const rows = table.bodyRows.map((row) => {
    const cells = Array.from({ length: columnCount }, (_value, columnIndex) =>
      renderCell("td", row[columnIndex] || "", columns[columnIndex].alignment)
    ).join("");
    return `<tr>${cells}</tr>`;
  });

  return [
    '<div class="markdown-preview__table-wrap"><table>',
    `<thead><tr>${columns
      .map((column) => renderCell("th", column.header, column.alignment))
      .join("")}</tr></thead>`,
    `<tbody>${rows.join("")}</tbody>`,
    "</table></div>"
  ].join("");
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: ListType | null = null;
  let listItems: ListItem[] = [];
  let codeFence: { language: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    const content = paragraph.join(" ").trim();
    if (content) {
      html.push(`<p>${renderInlineMarkdown(content)}</p>`);
    }
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    html.push(`<${listType}>`);
    for (const item of listItems) {
      html.push(renderListItem(item));
    }
    html.push(`</${listType}>`);
    listType = null;
    listItems = [];
  };

  const renderListItem = (item: ListItem) => {
    if (!item.checkbox) {
      return `<li>${renderInlineMarkdown(item.text)}</li>`;
    }
    const checked = item.checked ? " checked" : "";
    return `<li class="markdown-preview__task-item"><label class="markdown-preview__task-label"><input class="markdown-preview__task-checkbox" type="checkbox" disabled${checked} /><span>${renderInlineMarkdown(item.text)}</span></label></li>`;
  };

  const flushCodeFence = () => {
    if (!codeFence) {
      return;
    }
    const language = codeFence.language.toLowerCase();
    const content = codeFence.lines.join("\n");
    if (language === "mermaid") {
      html.push(
        `<section class="markdown-preview__diagram"><pre class="mermaid">${escapeHtml(content)}</pre><div class="markdown-preview__mermaid-fallback" hidden>Mermaid preview unavailable. Raw diagram source shown below.</div></section>`
      );
    } else {
      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(`<pre><code${languageClass}>${escapeHtml(content)}</code></pre>`);
    }
    codeFence = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.replace(/\t/g, "  ");

    if (codeFence) {
      if (line.trimStart().startsWith("```")) {
        flushCodeFence();
      } else {
        codeFence.lines.push(rawLine);
      }
      continue;
    }

    const fenceMatch = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);
    if (fenceMatch) {
      flushParagraph();
      flushList();
      codeFence = {
        language: fenceMatch[1] || "",
        lines: []
      };
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const tableBlock = parseTableBlock(lines, index);
    if (tableBlock) {
      flushParagraph();
      flushList();
      html.push(renderTableBlock(tableBlock));
      index += tableBlock.bodyRows.length + 1;
      continue;
    }

    const taskMatch = line.match(/^\s*-\s+\[( |x|X)\]\s+(.*)$/);
    if (taskMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push({
        checkbox: true,
        checked: taskMatch[1].toLowerCase() === "x",
        text: taskMatch[2]
      });
      continue;
    }

    const unorderedMatch = line.match(/^\s*-\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push({ text: unorderedMatch[1] });
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push({ text: orderedMatch[1] });
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return html.join("\n");
}

export function buildGuidedRequestPrompt(basePrompt: string): string {
  const trimmedBase = basePrompt.trim();
  const sections = [
    trimmedBase,
    "",
    "Help me draft a new Logics request for this repository.",
    "Use the standard Logics request structure with clear Needs, Context, a Mermaid diagram, Acceptance criteria, Scope, and Dependencies/risks.",
    "Ask concise clarification questions first if critical information is missing before drafting the request.",
    "",
    "My need:",
    "- Describe the need here",
    "",
    "Constraints / context:",
    "- Add context here",
    "",
    "Expected outcome:",
    "- Produce a request-ready draft I can turn into a Logics document"
  ];
  return sections.filter((entry, index) => entry.length > 0 || sections[index - 1] !== "").join("\n");
}

export function parseGitStatusEntries(stdout: string): GitStatusEntry[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length >= 4)
    .map((line) => ({
      indexStatus: line[0],
      workTreeStatus: line[1],
      path: normalizeGitPath(line.slice(3))
    }));
}

export function isBootstrapScopedPath(filePath: string): boolean {
  return filePath === ".gitmodules" || filePath === "logics" || filePath.startsWith("logics/");
}

export function buildBootstrapCommitMessage(changedPaths: string[]): string {
  const normalized = changedPaths.map((entry) => entry.replace(/\\/g, "/"));
  const hasSubmodule = normalized.some((entry) => entry === ".gitmodules" || entry.startsWith("logics/skills"));
  const hasWorkflowDocs = normalized.some(
    (entry) => entry.startsWith("logics/") && !entry.startsWith("logics/skills")
  );

  if (hasSubmodule && hasWorkflowDocs) {
    return "Bootstrap Logics kit and initialize workflow docs";
  }
  if (hasSubmodule) {
    return "Bootstrap Logics kit";
  }
  if (hasWorkflowDocs) {
    return "Initialize Logics workflow docs";
  }
  return "Bootstrap Logics setup";
}
