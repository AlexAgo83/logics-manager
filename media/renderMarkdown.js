(() => {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(value) {
    const codeSpans = [];
    const withPlaceholders = String(value).replace(/`([^`]+)`/g, (_match, code) => {
      const placeholder = `@@CODE_SPAN_${codeSpans.length}@@`;
      codeSpans.push(code);
      return placeholder;
    });

    let rendered = escapeHtml(withPlaceholders);
    rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      return `<a href="${escapeHtml(String(href).trim())}">${escapeHtml(String(label).trim())}</a>`;
    });
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    rendered = rendered.replace(/~~([^~]+)~~/g, "<s>$1</s>");

    codeSpans.forEach((code, index) => {
      rendered = rendered.replace(`@@CODE_SPAN_${index}@@`, `<code>${escapeHtml(String(code))}</code>`);
    });
    return rendered;
  }

  function renderMarkdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let listType = null;
    let listItems = [];
    let codeFence = null;

    function flushParagraph() {
      if (paragraph.length === 0) {
        return;
      }
      const content = paragraph.join(" ").trim();
      if (content) {
        html.push(`<p>${renderInlineMarkdown(content)}</p>`);
      }
      paragraph = [];
    }

    function flushList() {
      if (!listType || listItems.length === 0) {
        listType = null;
        listItems = [];
        return;
      }
      html.push(`<${listType}>`);
      listItems.forEach((item) => {
        html.push(renderListItem(item));
      });
      html.push(`</${listType}>`);
      listType = null;
      listItems = [];
    }

    function renderListItem(item) {
      if (!item.checkbox) {
        return `<li>${renderInlineMarkdown(item.text)}</li>`;
      }
      const checked = item.checked ? " checked" : "";
      return `<li class="markdown-preview__task-item"><label class="markdown-preview__task-label"><input class="markdown-preview__task-checkbox" type="checkbox" disabled${checked} /><span>${renderInlineMarkdown(item.text)}</span></label></li>`;
    }

    function flushCodeFence() {
      if (!codeFence) {
        return;
      }
      const language = String(codeFence.language || "").toLowerCase();
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
    }

    lines.forEach((rawLine) => {
      const line = rawLine.replace(/\t/g, "  ");

      if (codeFence) {
        if (line.trimStart().startsWith("```")) {
          flushCodeFence();
        } else {
          codeFence.lines.push(rawLine);
        }
        return;
      }

      const fenceMatch = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);
      if (fenceMatch) {
        flushParagraph();
        flushList();
        codeFence = {
          language: fenceMatch[1] || "",
          lines: []
        };
        return;
      }

      if (line.trim() === "") {
        flushParagraph();
        flushList();
        return;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
        return;
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
        return;
      }

      const unorderedMatch = line.match(/^\s*-\s+(.*)$/);
      if (unorderedMatch) {
        flushParagraph();
        if (listType && listType !== "ul") {
          flushList();
        }
        listType = "ul";
        listItems.push({ text: unorderedMatch[1] });
        return;
      }

      const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        if (listType && listType !== "ol") {
          flushList();
        }
        listType = "ol";
        listItems.push({ text: orderedMatch[1] });
        return;
      }

      flushList();
      paragraph.push(line.trim());
    });

    flushParagraph();
    flushList();
    flushCodeFence();
    return html.join("\n");
  }

  function buildReadPreviewDocument(item, sourceLabel, content) {
    const safeTitle = escapeHtml(item && item.title ? item.title : "Logics item");
    const safeSourceLabel = escapeHtml(sourceLabel || "unknown");
    const renderedHtml = renderMarkdownToHtml(stripLeadingDocumentFrontMatter(content || "", item || {}));
    return `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>
      body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);color:#0f172a;}
      .preview{max-width:980px;margin:0 auto;padding:24px 24px 48px;}
      .preview__header{margin-bottom:24px;padding:18px 20px;border:1px solid rgba(148,163,184,.35);border-radius:16px;background:rgba(255,255,255,.75);backdrop-filter:blur(8px);}
      .preview__title{margin:0 0 4px;font-size:32px;line-height:1.1;}
      .preview__source{margin:0;color:#475569;font-size:14px;}
      .preview__body{padding:24px 28px;border-radius:18px;background:#fff;border:1px solid rgba(148,163,184,.28);box-shadow:0 18px 40px rgba(15,23,42,.08);}
      .preview__body h1,.preview__body h2,.preview__body h3,.preview__body h4{line-height:1.15;margin:1.35em 0 .55em;}
      .preview__body h1:first-child,.preview__body h2:first-child,.preview__body h3:first-child{margin-top:0;}
      .preview__body pre{overflow-x:auto;padding:16px;border-radius:14px;background:#e2e8f0;border:1px solid rgba(148,163,184,.35);}
      .preview__body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;}
      .preview__body p code,.preview__body li code{padding:2px 6px;border-radius:6px;background:#e2e8f0;}
      .preview__body .markdown-preview__task-item{margin:.15em 0;}
      .preview__body .markdown-preview__task-label{display:inline-flex;align-items:flex-start;gap:.65em;}
      .preview__body .markdown-preview__task-checkbox{margin-top:.2em;width:1rem;height:1rem;flex:0 0 auto;accent-color:#0369a1;}
      .preview__body a{color:#0369a1;}
      .markdown-preview__diagram svg{max-width:100%;height:auto;}
      .markdown-preview__mermaid-fallback{margin-top:10px;padding:10px 12px;border-radius:10px;color:#991b1b;background:#fee2e2;border:1px solid rgba(248,113,113,.35);}
    </style></head><body><div class="preview"><header class="preview__header"><h1 class="preview__title">${safeTitle}</h1><p class="preview__source">Source: <code>${safeSourceLabel}</code></p></header><main class="preview__body">${renderedHtml}</main></div><script src="/node_modules/mermaid/dist/mermaid.min.js"></script><script>
      (() => {
        const fallbackNodes = Array.from(document.querySelectorAll(".markdown-preview__mermaid-fallback"));
        const showFallback = (message) => {
          fallbackNodes.forEach((node) => {
            node.hidden = false;
            if (message) {
              node.textContent = message;
            }
          });
        };
        if (!window.mermaid) {
          showFallback("Mermaid preview unavailable. Raw diagram source shown below.");
          return;
        }
        try {
          window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
          const nodes = Array.from(document.querySelectorAll(".mermaid"));
          if (nodes.length === 0) {
            return;
          }
          Promise.resolve(window.mermaid.run({ nodes })).catch((error) => {
            const detail = error instanceof Error ? error.message : String(error);
            showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          showFallback("Mermaid preview unavailable. Raw diagram source shown below. (" + detail + ")");
        }
      })();
    </script></body></html>`;
  }

  function stripLeadingDocumentFrontMatter(markdown, item) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    let index = 0;
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
    if (index >= lines.length) {
      return markdown;
    }

    const headingMatch = lines[index].match(/^(#{1,6})\s+(.*)$/);
    if (!headingMatch) {
      return stripLeadingIndicatorBlock(markdown);
    }

    const normalizedHeading = headingMatch[2].replace(/\s+/g, " ").trim().toLowerCase();
    const title = String(item && item.title ? item.title : "").replace(/\s+/g, " ").trim().toLowerCase();
    const id = String(item && item.id ? item.id : "").replace(/\s+/g, " ").trim().toLowerCase();
    const titleWithId = id && title ? `${id} - ${title}` : "";
    const headingMatches =
      (title && normalizedHeading === title) ||
      (titleWithId && normalizedHeading === titleWithId) ||
      (id && normalizedHeading.startsWith(`${id} - `));

    if (!headingMatches) {
      return stripLeadingIndicatorBlock(markdown);
    }

    const remainder = lines.slice(index + 1).join("\n");
    return stripLeadingIndicatorBlock(remainder);
  }

  function stripLeadingIndicatorBlock(markdown) {
    const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
    let index = 0;
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
    if (index >= lines.length || !lines[index].trimStart().startsWith(">")) {
      return markdown;
    }

    let cursor = index;
    let sawIndicatorLine = false;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line.trim() === "") {
        break;
      }
      if (!line.trimStart().startsWith(">")) {
        break;
      }
      sawIndicatorLine =
        sawIndicatorLine ||
        />(\s+)?(From version|Schema version|Status|Understanding|Confidence|Progress|Complexity|Theme|Reminder)\s*:/.test(line);
      cursor += 1;
    }

    if (!sawIndicatorLine) {
      return markdown;
    }

    while (cursor < lines.length && lines[cursor].trim() === "") {
      cursor += 1;
    }
    return lines.slice(cursor).join("\n");
  }

  window.createCdxLogicsMarkdownApi = function createCdxLogicsMarkdownApi() {
    return {
      escapeHtml,
      buildReadPreviewDocument
    };
  };
})();
