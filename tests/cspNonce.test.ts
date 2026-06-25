import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({}));

import { getNonce } from "../clients/vscode/src/logicsReadPreviewHtml";

describe("getNonce", () => {
  it("returns a 32-char alphanumeric CSPRNG nonce that varies", () => {
    const a = getNonce();
    const b = getNonce();
    expect(a).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(b).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(a).not.toBe(b);
  });
});
