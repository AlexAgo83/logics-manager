import { describe, expect, it } from "vitest";
import {
  buildBootstrapCommitMessage,
  buildGuidedRequestPrompt,
  isBootstrapScopedPath,
  parseGitStatusEntries,
  renderMarkdownToHtml
} from "../src/workflowSupport";

describe("workflowSupport", () => {
  it("renders headings, lists, and Mermaid fences into preview html", () => {
    const html = renderMarkdownToHtml(
      [
        "# Title",
        "",
        "- first item",
        "- second item",
        "",
        "```mermaid",
        "flowchart TD",
        "A[One] --> B[Two]",
        "```"
      ].join("\n")
    );

    expect(html.includes("<h1>Title</h1>")).toBe(true);
    expect(html.includes("<ul>")).toBe(true);
    expect(html.includes('class="mermaid"')).toBe(true);
    expect(html.includes("A[One] --&gt; B[Two]")).toBe(true);
  });

  it("keeps indented list items as list entries instead of flattening them into paragraphs", () => {
    const html = renderMarkdownToHtml(
      [
        "# Scope",
        "",
        "- In:",
        "  - First nested item",
        "  - Second nested item"
      ].join("\n")
    );

    expect(html.includes("<li>In:</li>")).toBe(true);
    expect(html.includes("<li>First nested item</li>")).toBe(true);
    expect(html.includes("<li>Second nested item</li>")).toBe(true);
  });

  it("renders task list checkboxes and stylized inline markdown in list items", () => {
    const html = renderMarkdownToHtml(
      [
        "- [ ] Open task",
        "- [x] Done task with `code` and ~~done~~",
        "- Plain item"
      ].join("\n")
    );

    expect(html.includes('class="markdown-preview__task-checkbox"')).toBe(true);
    expect(html.includes('type="checkbox" disabled')).toBe(true);
    expect(html.includes("checked")).toBe(true);
    expect(html.includes("<code>code</code>")).toBe(true);
    expect(html.includes("<s>done</s>")).toBe(true);
    expect(html.includes("Plain item")).toBe(true);
  });

  it("renders markdown tables as structured table markup with inline formatting", () => {
    const html = renderMarkdownToHtml(
      [
        "| Surface | Pre-V2 role | Post-V2 role |",
        "|---|:---:|---:|",
        "| DeepVault - Navy | Primary local explorer for validation | Internal operator tool with `code` |",
        "| DeepVault - Gordon | Planned Teams channel | Primary production user-facing channel |"
      ].join("\n")
    );

    expect(html).toContain('class="markdown-preview__table-wrap"');
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain('<th scope="col">Surface</th>');
    expect(html).toContain('<th scope="col" style="text-align:center">Pre-V2 role</th>');
    expect(html).toContain('<th scope="col" style="text-align:right">Post-V2 role</th>');
    expect(html).toContain("<code>code</code>");
  });

  it("builds a guided request prompt from the agent default prompt", () => {
    const prompt = buildGuidedRequestPrompt("Use $logics-flow-manager to manage workflow docs.");
    expect(prompt.includes("Use $logics-flow-manager")).toBe(true);
    expect(prompt.includes("Help me draft a new Logics request")).toBe(true);
    expect(prompt.includes("My need:")).toBe(true);
  });

  it("parses git porcelain output and recognizes bootstrap-scoped paths", () => {
    const entries = parseGitStatusEntries([" M README.md", "?? .gitmodules", "?? logics/request/req_001_demo.md"].join("\n"));
    expect(entries.map((entry) => entry.path)).toEqual(["README.md", ".gitmodules", "logics/request/req_001_demo.md"]);
    expect(isBootstrapScopedPath(".gitmodules")).toBe(true);
    expect(isBootstrapScopedPath("logics/request/req_001_demo.md")).toBe(true);
    expect(isBootstrapScopedPath("README.md")).toBe(false);
  });

  it("generates specific bootstrap commit messages from changed paths", () => {
    expect(buildBootstrapCommitMessage([".gitmodules", "logics/skills"])).toBe("Bootstrap Logics kit");
    expect(buildBootstrapCommitMessage([".gitmodules", "logics/request/req_001_demo.md"])).toBe(
      "Bootstrap Logics kit and initialize workflow docs"
    );
    expect(buildBootstrapCommitMessage(["logics/request/req_001_demo.md"])).toBe("Initialize Logics workflow docs");
  });
});
