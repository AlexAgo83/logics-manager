/**
 * req_341/item_704: a reopen has to be earned by new content.
 *
 * The guard existed and watched the wrong thing: it stored the extension version, so
 * 2.21.4, .5, .6 and .7 -- four releases in two days, identical onboarding page --
 * reopened the panel four times while working exactly as written.
 */
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: { createWebviewPanel: vi.fn() },
  ViewColumn: { Beside: 2 },
  Uri: { file: (p: string) => ({ fsPath: p }) }
}));

import { onboardingContentSignature } from "../clients/vscode/src/logicsOnboardingHtml";
import { maybeShowOnboarding } from "../clients/vscode/src/logicsViewProviderSupport";
import { ONBOARDING_LAST_CONTENT_KEY } from "../clients/vscode/src/logicsViewProviderConstants";

function createHost(store: Map<string, unknown>, version = "2.21.7") {
  const opened: string[] = [];
  const host = {
    context: {
      extension: { packageJSON: { version } },
      workspaceState: {
        get: (key: string) => store.get(key),
        update: async (key: string, value: unknown) => {
          store.set(key, value);
        }
      }
    },
    openOnboardingPanel: () => {
      opened.push("opened");
    }
  };
  return { host, opened };
}

function show(store: Map<string, unknown>, root: string, version?: string): number {
  const { host, opened } = createHost(store, version);
  maybeShowOnboarding.call(host as never, root);
  return opened.length;
}

describe("the onboarding content signature", () => {
  it("is identical across builds, because it never sees the nonce", () => {
    // The trap this request exists to avoid: buildOnboardingHtml embeds a fresh
    // getNonce() in its CSP, so hashing the rendered document would change the
    // signature every time and reopen the panel always.
    const signatures = new Set(Array.from({ length: 5 }, () => onboardingContentSignature()));

    expect(signatures.size).toBe(1);
    expect([...signatures][0]).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("maybeShowOnboarding", () => {
  let store: Map<string, unknown>;
  const root = path.join(path.sep, "tmp", "workspace-a");

  beforeEach(() => {
    store = new Map<string, unknown>();
  });

  it("shows the page once, then stays closed however many versions ship", () => {
    expect(show(store, root, "2.21.4")).toBe(1);

    // Four releases, none of which touched the page.
    for (const version of ["2.21.5", "2.21.6", "2.21.7", "3.0.0"]) {
      expect(show(store, root, version)).toBe(0);
    }
  });

  it("reopens once when the content actually changes", () => {
    expect(show(store, root)).toBe(1);

    store.set(`${ONBOARDING_LAST_CONTENT_KEY}:${path.resolve(root)}`, "0000000000000000");

    expect(show(store, root)).toBe(1);
    expect(show(store, root)).toBe(0);
  });

  it("stores the signature rather than the version", () => {
    show(store, root, "2.21.7");

    const stored = store.get(`${ONBOARDING_LAST_CONTENT_KEY}:${path.resolve(root)}`);
    expect(stored).toBe(onboardingContentSignature());
    expect(stored).not.toBe("2.21.7");
  });

  it("stays scoped per workspace root", () => {
    const other = path.join(path.sep, "tmp", "workspace-b");

    expect(show(store, root)).toBe(1);
    // A brand-new workspace has never shown the page, whatever another one saw.
    expect(show(store, other)).toBe(1);
    expect(show(store, root)).toBe(0);
    expect(show(store, other)).toBe(0);
  });

  it("does not read the old version key, so a stale value cannot suppress the page", () => {
    store.set(`logics.onboardingLastVersion:${path.resolve(root)}`, "2.21.7");

    expect(show(store, root, "2.21.7")).toBe(1);
  });
});
