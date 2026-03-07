export type GitStatusEntry = {
  indexStatus: string;
  workTreeStatus: string;
  path: string;
};

type ListType = "ul" | "ol";

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

  for (let i = 0; i < codeSpans.length; i += 1) {
    const placeholder = `@@CODE_SPAN_${i}@@`;
    rendered = rendered.replace(placeholder, `<code>${escapeHtml(codeSpans[i])}</code>`);
  }

  return rendered;
}

export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: ListType | null = null;
  let listItems: string[] = [];
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
      html.push(`<li>${renderInlineMarkdown(item)}</li>`);
    }
    html.push(`</${listType}>`);
    listType = null;
    listItems = [];
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

  for (const rawLine of lines) {
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

    const unorderedMatch = line.match(/^\s*-\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push(orderedMatch[1]);
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
