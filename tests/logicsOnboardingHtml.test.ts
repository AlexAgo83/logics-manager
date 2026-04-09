import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}));

import { buildOnboardingHtml } from "../src/logicsOnboardingHtml";

describe("buildOnboardingHtml", () => {
  it("renders prompt examples for each onboarding stage", () => {
    const html = buildOnboardingHtml({} as never);

    expect(html).toContain("Example prompt");
    expect(html).toContain("Draft a new request for this problem");
    expect(html).toContain("Split the new request into backlog items");
    expect(html).toContain("Execute task &lt;task id or title&gt;");
    expect(html).toContain("Open Logics Insights");
    expect(html).toContain("data-action=\"open-logics-insights\"");
    expect(html).toContain("About");
    expect(html).toContain("data-action=\"about\"");
    expect(html).toContain(".onboarding__footer-action[data-action]");
  });
});
