import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

function loadMarkdownApi() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "outside-only"
  });
  const source = fs.readFileSync(path.resolve(process.cwd(), "clients/shared-web/media/renderMarkdown.js"), "utf8");
  new vm.Script(source, { filename: "clients/shared-web/media/renderMarkdown.js" }).runInContext(dom.getInternalVMContext());
  return dom.window.createCdxLogicsMarkdownApi();
}

describe("renderMarkdown", () => {
  it("renders aligned tables while preserving escaped pipe characters", () => {
    const api = loadMarkdownApi();

    const html = api.renderMarkdownToHtml([
      "| Name | Result | Notes |",
      "| :--- | ---: | :---: |",
      "| `cdx` | 42 | escaped \\| pipe |"
    ].join("\n"));

    expect(html).toContain('<div class="markdown-preview__table-wrap"><table>');
    expect(html).toContain('<th scope="col" style="text-align:left">Name</th>');
    expect(html).toContain('<th scope="col" style="text-align:right">Result</th>');
    expect(html).toContain('<th scope="col" style="text-align:center">Notes</th>');
    expect(html).toContain('<td style="text-align:left"><code>cdx</code></td>');
    expect(html).toContain('<td style="text-align:center">escaped | pipe</td>');
  });

  it("escapes code fences and inline links before building the preview document", () => {
    const api = loadMarkdownApi();

    const html = api.buildReadPreviewDocument(
      { id: "req_001_demo", title: "Demo <Item>" },
      "logics/request/req_001_demo.md",
      [
        "## req_001_demo - Demo <Item>",
        "> Status: Draft",
        "",
        "See [docs](https://example.com?q=<bad>).",
        "",
        "```html",
        "<script>alert('x')</script>",
        "```"
      ].join("\n")
    );

    expect(html).toContain("<title>Demo &lt;Item&gt;</title>");
    expect(html).toContain('<a href="https://example.com?q=&amp;lt;bad&amp;gt;">docs</a>');
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).not.toContain("> Status: Draft");
  });
});
